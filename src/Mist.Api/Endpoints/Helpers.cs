using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Mist.Api.Data;
using Mist.Api.Domain;
using Mist.Api.Security;
namespace Mist.Api.Endpoints;

public static class Helpers
{
    public static IQueryable<DocumentRequest> VisibleDocuments(MistDb db, ClaimsPrincipal actor)
    {
        var id = actor.UserId();
        return actor.UserRole() switch
        {
            Roles.Student => db.Documents.Where(d => d.StudentId == id),
            Roles.Curator => db.Documents.Where(d => d.AssignedCuratorId == id),
            Roles.Mentor => db.Documents.Where(d => db.Cases.Any(c => c.DocumentRequestId == d.Id && c.MentorId == id && c.Consent)),
            _ => db.Documents.Where(d => false)
        };
    }
    public static IQueryable<DualCase> VisibleCases(MistDb db, ClaimsPrincipal actor)
    {
        var id = actor.UserId();
        return actor.UserRole() switch
        {
            Roles.Student => db.Cases.Where(c => c.StudentId == id),
            Roles.Mentor => db.Cases.Where(c => c.MentorId == id),
            Roles.Curator => db.Cases.Where(c => c.CuratorId == id),
            _ => db.Cases.Where(c => false)
        };
    }
    public static IQueryable<Report> VisibleReports(MistDb db, ClaimsPrincipal actor)
        => db.Reports.Where(r => VisibleCases(db, actor).Any(c => c.Id == r.CaseId));
    public static void Audit(MistDb db, ClaimsPrincipal actor, string kind, Guid id, string action, string note = "", int? version = null)
        => db.AuditEvents.Add(new AuditEvent { ActorId = actor.UserId(), ResourceType = kind, ResourceId = id, Action = action, Note = note, Version = version });
    public static bool IsRole(ClaimsPrincipal actor, string role) => actor.UserRole() == role;
    public static IResult Invalid(string message) => Results.Problem(statusCode: 409, title: "Invalid workflow transition", detail: message);
}
