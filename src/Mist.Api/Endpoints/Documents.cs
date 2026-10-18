using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Mist.Api.Data;
using Mist.Api.Domain;
using Mist.Api.Security;

namespace Mist.Api.Endpoints;
public sealed record NewDocument(string Kind, string Purpose);
public sealed record DocumentDecision(string? Comment, int ExpectedRevision);
public static class Documents
{
    public static void MapDocuments(this WebApplication app)
    {
        var g = app.MapGroup("/api/documents").RequireAuthorization();
        g.MapGet("/", async (ClaimsPrincipal actor, MistDb db) => await Helpers.VisibleDocuments(db, actor).OrderByDescending(x => x.RequestedAt).ToListAsync());
        g.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal actor, MistDb db) =>
            await Helpers.VisibleDocuments(db, actor).SingleOrDefaultAsync(x => x.Id == id) is { } doc ? Results.Ok(doc) : Results.NotFound());
        g.MapPost("/", async (NewDocument request, ClaimsPrincipal actor, MistDb db) =>
        {
            if (!Helpers.IsRole(actor, Roles.Student)) return Results.Forbid();
            if (request.Kind is not ("study" or "transcript")) return Results.BadRequest("Only study and transcript requests are supported.");
            try
            {
                var purpose = Workflow.Text(request.Purpose, 3, 200);
                var u = await db.Users.FindAsync(actor.UserId());
                if (u is null || !u.Active) return Results.Forbid();
                var exists = await db.Documents.AnyAsync(x => x.StudentId == u.Id && x.Kind == request.Kind && (x.Status == States.Requested || x.Status == States.Processing));
                if (exists) return Helpers.Invalid("Duplicate pending document request.");
                var curator = await db.Users.SingleOrDefaultAsync(x => x.Role == Roles.Curator && x.GroupCode == u.GroupCode && x.Active);
                if (curator is null) return Results.Problem(statusCode: 503, title: "No assigned curator");
                var doc = new DocumentRequest { StudentId = u.Id, AssignedCuratorId = curator.Id, GroupCode = u.GroupCode, Kind = request.Kind, Purpose = purpose };
                db.Documents.Add(doc);
                Helpers.Audit(db, actor, "document", doc.Id, "requested");
                await db.SaveChangesAsync();
                return Results.Created($"/api/documents/{doc.Id}", doc);
            }
            catch (WorkflowException ex) { return Results.BadRequest(ex.Message); }
        });
        g.MapPost("/{id:guid}/{action}", async (Guid id, string action, DocumentDecision payload, ClaimsPrincipal actor, MistDb db) =>
        {
            if (action is not ("cancel" or "process" or "issue" or "reject")) return Results.NotFound();
            if (action == "cancel" ? !Helpers.IsRole(actor, Roles.Student) : !Helpers.IsRole(actor, Roles.Curator)) return Results.Forbid();
            var d = await Helpers.VisibleDocuments(db, actor).SingleOrDefaultAsync(x => x.Id == id);
            if (d is null) return Results.NotFound();
            if (d.Revision != payload.ExpectedRevision) return Helpers.Invalid("Stale document revision.");
            try
            {
                var studentActive = await db.Users.AnyAsync(x => x.Id == d.StudentId && x.Active);
                var comment = action == "reject" ? Workflow.Text(payload.Comment, 5, 800) : null;
                Workflow.TransitionDocument(d, action, studentActive);
                if (comment is not null) d.Comment = comment;
                if (action == "issue") { d.IssuerId = actor.UserId(); d.IssuedAt = DateTimeOffset.UtcNow; }
                Helpers.Audit(db, actor, "document", d.Id, action, comment ?? "");
                await db.SaveChangesAsync();
                return Results.Ok(d);
            }
            catch (WorkflowException ex) { return Helpers.Invalid(ex.Message); }
        });
    }
}
