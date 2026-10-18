using System.Globalization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Mist.Api.Data;
using Mist.Api.Domain;
using Mist.Api.Security;
using Mist.Api.Storage;
namespace Mist.Api.Endpoints;

public sealed record ReviewRequest(int Version, string Decision, bool Confirmed, string Comment);
public static class Reports
{
    public static void MapReports(this WebApplication app)
    {
        var g = app.MapGroup("/api/reports").RequireAuthorization();
        g.MapGet("/", async (ClaimsPrincipal actor, MistDb db) =>
        {
            var reports = await Helpers.VisibleReports(db, actor).OrderBy(x => x.OutcomeId).ToListAsync();
            var ids = reports.Select(x => x.Id).ToArray();
            var revisions = await db.ReportRevisions.Where(x => ids.Contains(x.ReportId)).OrderByDescending(x => x.Version).ToListAsync();
            var decisions = await db.Decisions.Where(x => ids.Contains(x.ReportId)).OrderBy(x => x.CreatedAt).ToListAsync();
            return Results.Ok(new { reports, revisions, decisions });
        });
        g.MapPost("/", async (HttpRequest request, ClaimsPrincipal actor, MistDb db, PrivateFiles storage, CancellationToken ct) =>
        {
            if (!Helpers.IsRole(actor, Roles.Student)) return Results.Forbid();
            if (!request.HasFormContentType) return Results.BadRequest("multipart/form-data expected.");
            var f = await request.ReadFormAsync(ct);
            if (!Guid.TryParse(f["caseId"], out var caseId)) return Results.BadRequest("Invalid case ID.");
            var c = await Helpers.VisibleCases(db, actor).SingleOrDefaultAsync(x => x.Id == caseId, ct);
            if (c is null) return Results.NotFound();
            if (c.Status != States.Active) return Helpers.Invalid("Case is not active.");
            StoredFile? uploaded = null;
            try
            {
                var outcome = (string?)f["outcomeId"] ?? "";
                Workflow.Require(Workflow.Outcomes.ContainsKey(outcome), "Unknown outcome.");
                Workflow.Require(double.TryParse(f["hours"], NumberStyles.Float, CultureInfo.InvariantCulture, out var hours) && double.IsFinite(hours) && hours >= .5 && hours <= 160, "Hours must be between 0.5 and 160.");
                var validFrom = DateOnly.TryParseExact(f["from"], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var from);
                var validTo = DateOnly.TryParseExact(f["to"], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var to);
                Workflow.Require(validFrom && validTo && from <= to && to <= DateOnly.FromDateTime(DateTime.UtcNow), "Invalid reporting period.");
                var summary = Workflow.Text(f["summary"], 30, 3000);
                var evidence = Workflow.Text(f["evidence"], 15, 2000);
                var report = await db.Reports.SingleOrDefaultAsync(x => x.CaseId == caseId && x.OutcomeId == outcome, ct);
                Guid.TryParse(f["reportId"], out var claimedId);
                var expected = int.TryParse(f["version"], out var n) ? n : (int?)null;
                if (report is null)
                {
                    Workflow.Require(claimedId == Guid.Empty, "Report does not exist.");
                    report = new Report { CaseId = caseId, OutcomeId = outcome };
                    db.Reports.Add(report);
                }
                else Workflow.Require(claimedId == report.Id, "Report identifier mismatch.");
                Workflow.Submit(report, expected);
                var revision = new ReportRevision { ReportId = report.Id, Version = report.Version, Hours = hours, FromDate = from, ToDate = to, Summary = summary, Evidence = evidence };
                var file = f.Files.GetFile("attachment");
                if (file is not null)
                {
                    var used = await db.Files.Where(x => db.ReportRevisions.Any(y => y.Id == x.ReportRevisionId && db.Reports.Any(r => r.Id == y.ReportId && r.CaseId == caseId))).SumAsync(x => (long?)x.Length, ct) ?? 0L;
                    Workflow.Require(used + file.Length <= 2 * 1024 * 1024, "Case upload quota exceeded.");
                    uploaded = await storage.SaveAsync(file, revision.Id, ct);
                    if (uploaded is not null) db.Files.Add(uploaded);
                }
                db.ReportRevisions.Add(revision);
                Helpers.Audit(db, actor, "report", report.Id, "submitted", outcome, report.Version);
                await db.SaveChangesAsync(ct);
                return Results.Created($"/api/reports/{report.Id}", new { report.Id, report.Version, report.Status });
            }
            catch (WorkflowException ex) { storage.Delete(uploaded); return Results.BadRequest(ex.Message); }
            catch { storage.Delete(uploaded); throw; }
        }).DisableAntiforgery(); // Authorization uses explicit bearer tokens, never cookies.
        g.MapPost("/{id:guid}/review", async (Guid id, ReviewRequest request, ClaimsPrincipal actor, MistDb db) =>
        {
            var role = actor.UserRole();
            if (role is not (Roles.Mentor or Roles.Curator)) return Results.Forbid();
            var r = await Helpers.VisibleReports(db, actor).SingleOrDefaultAsync(x => x.Id == id);
            if (r is null) return Results.NotFound();
            var c = await Helpers.VisibleCases(db, actor).SingleAsync(x => x.Id == r.CaseId);
            if (c.Status != States.Active) return Helpers.Invalid("Case is not active.");
            try
            {
                var comment = Workflow.Text(request.Comment, 5, 800);
                if (role == Roles.Curator)
                {
                    var mentorApproved = await db.Decisions.AnyAsync(x => x.ReportId == r.Id && x.Version == r.Version && x.Role == Roles.Mentor && x.Decision == "approve");
                    Workflow.Require(mentorApproved, "Mentor must approve this version first.");
                }
                Workflow.Review(r, role, request.Decision, request.Version, request.Confirmed);
                db.Decisions.Add(new ReportDecision { ReportId = r.Id, Version = r.Version, ReviewerId = actor.UserId(), Role = role, Decision = request.Decision, Comment = comment });
                Helpers.Audit(db, actor, "report", r.Id, request.Decision, comment, r.Version);
                await db.SaveChangesAsync();
                return Results.Ok(new { r.Id, r.Version, r.Status });
            }
            catch (WorkflowException ex) { return Helpers.Invalid(ex.Message); }
        });
        g.MapGet("/{id:guid}/versions", async (Guid id, ClaimsPrincipal actor, MistDb db) =>
        {
            if (!await Helpers.VisibleReports(db, actor).AnyAsync(x => x.Id == id)) return Results.NotFound();
            var versions = await db.ReportRevisions.Where(x => x.ReportId == id).OrderBy(x => x.Version).ToListAsync();
            var decisions = await db.Decisions.Where(x => x.ReportId == id).OrderBy(x => x.CreatedAt).ToListAsync();
            var revisionIds = versions.Select(x => x.Id).ToArray();
            var files = await db.Files.Where(x => revisionIds.Contains(x.ReportRevisionId)).Select(x => new { x.Id, x.ReportRevisionId, x.FileName, x.Length, x.Sha256 }).ToListAsync();
            return Results.Ok(new { versions, decisions, files });
        });
        g.MapGet("/{id:guid}/files/{fileId:guid}", async (Guid id, Guid fileId, ClaimsPrincipal actor, MistDb db, PrivateFiles storage) =>
        {
            if (!await Helpers.VisibleReports(db, actor).AnyAsync(x => x.Id == id)) return Results.NotFound();
            var file = await db.Files.SingleOrDefaultAsync(x => x.Id == fileId && db.ReportRevisions.Any(r => r.Id == x.ReportRevisionId && r.ReportId == id));
            if (file is null || !File.Exists(storage.FullPath(file))) return Results.NotFound();
            return Results.File(storage.FullPath(file), "application/octet-stream", file.FileName, enableRangeProcessing: false);
        });
    }
}
