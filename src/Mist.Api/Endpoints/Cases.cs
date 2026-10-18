using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Mist.Api.Data;
using Mist.Api.Domain;
using Mist.Api.Security;
namespace Mist.Api.Endpoints;
public sealed record NewCase(Guid DocumentId, bool Consent, string Motivation);
public sealed record CaseDecision(int ExpectedRevision, bool Confirmed, string? Comment);
public static class Cases
{
    public static void MapCases(this WebApplication app)
    {
        var g = app.MapGroup("/api/cases").RequireAuthorization();
        g.MapGet("/", async (ClaimsPrincipal actor, MistDb db) => await Helpers.VisibleCases(db, actor).OrderByDescending(x => x.CreatedAt).ToListAsync());
        g.MapPost("/", async (NewCase request, ClaimsPrincipal actor, MistDb db) =>
        {
            if (!Helpers.IsRole(actor, Roles.Student)) return Results.Forbid();
            try
            {
                Workflow.Require(request.Consent, "Explicit consent required.");
                var motivation = Workflow.Text(request.Motivation, 15, 1200);
                var student = await db.Users.FindAsync(actor.UserId());
                if (student is null || !student.Active) return Results.Forbid();
                var doc = await db.Documents.SingleOrDefaultAsync(d => d.Id == request.DocumentId && d.StudentId == student.Id && d.Kind == "study" && d.Status == States.Ready);
                if (doc is null) return Helpers.Invalid("An issued study certificate is required.");
                if (await db.Cases.AnyAsync(x => x.StudentId == student.Id)) return Helpers.Invalid("Student already has a case.");
                var mentor = await db.Users.SingleOrDefaultAsync(u => u.Role == Roles.Mentor && u.Active && u.GroupCode == student.GroupCode && u.CompanyCode != "");
                var curator = await db.Users.SingleOrDefaultAsync(u => u.Role == Roles.Curator && u.Active && u.GroupCode == student.GroupCode);
                if (mentor is null || curator is null) return Results.Problem(statusCode: 503, title: "Assigned reviewers unavailable");
                var c = new DualCase { StudentId = student.Id, MentorId = mentor.Id, CuratorId = curator.Id, GroupCode = student.GroupCode, CompanyCode = mentor.CompanyCode, DocumentRequestId = doc.Id, Consent = true, Motivation = motivation };
                db.Cases.Add(c); Helpers.Audit(db, actor, "case", c.Id, "applied");
                await db.SaveChangesAsync();
                return Results.Created($"/api/cases/{c.Id}", c);
            }
            catch (WorkflowException ex) { return Results.BadRequest(ex.Message); }
        });
        g.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal actor, MistDb db) =>
            await Helpers.VisibleCases(db, actor).SingleOrDefaultAsync(x => x.Id == id) is { } c ? Results.Ok(c) : Results.NotFound());
        g.MapPost("/{id:guid}/{action}", async (Guid id, string action, CaseDecision request, ClaimsPrincipal actor, MistDb db) =>
        {
            if (action is not ("accept" or "approve-plan" or "complete")) return Results.NotFound();
            var required = action == "accept" ? Roles.Mentor : Roles.Curator;
            if (!Helpers.IsRole(actor, required)) return Results.Forbid();
            var c = await Helpers.VisibleCases(db, actor).SingleOrDefaultAsync(x => x.Id == id);
            if (c is null) return Results.NotFound();
            if (c.Revision != request.ExpectedRevision) return Helpers.Invalid("Stale case revision.");
            try
            {
                var completed = await db.Reports.CountAsync(x => x.CaseId == c.Id && x.Status == States.Accepted);
                if (action == "complete")
                {
                    Workflow.Require(request.Confirmed, "Explicit final decision confirmation required.");
                    c.Decision = Workflow.Text(request.Comment, 15, 1200);
                }
                Workflow.TransitionCase(c, action, completed == Workflow.Outcomes.Count);
                if (action == "complete")
                {
                    c.CompletedAt = DateTimeOffset.UtcNow;
                    var document = new DocumentRequest { StudentId = c.StudentId, AssignedCuratorId = c.CuratorId, GroupCode = c.GroupCode, CaseId = c.Id, Kind = "dual", Purpose = "Demonstration dual education summary", Status = States.Ready, IssuedAt = DateTimeOffset.UtcNow, IssuerId = actor.UserId() };
                    db.Documents.Add(document);
                }
                Helpers.Audit(db, actor, "case", c.Id, action, action == "complete" ? c.Decision ?? "" : "");
                await db.SaveChangesAsync();
                return Results.Ok(c);
            }
            catch (WorkflowException ex) { return Helpers.Invalid(ex.Message); }
        });
    }
}
