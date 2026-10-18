using System.ComponentModel.DataAnnotations;
namespace Mist.Api.Domain;

public static class Roles
{
    public const string Student = "Student";
    public const string Mentor = "Mentor";
    public const string Curator = "Curator";
}
public static class States
{
    public const string Requested = "requested", Processing = "processing", Ready = "ready", Cancelled = "cancelled", Rejected = "rejected";
    public const string CompanyReview = "company_review", PlanReview = "plan_review", Active = "active", Completed = "completed";
    public const string Submitted = "submitted", MentorChanges = "mentor_changes", UniversityReview = "university_review", CuratorChanges = "curator_changes", Accepted = "accepted";
}
public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(120)] public string UserName { get; set; } = "";
    [MaxLength(150)] public string DisplayName { get; set; } = "";
    [MaxLength(20)] public string Role { get; set; } = "";
    [MaxLength(40)] public string GroupCode { get; set; } = "";
    [MaxLength(40)] public string CompanyCode { get; set; } = "";
    public bool Active { get; set; } = true;
    public string PasswordHash { get; set; } = "";
}
public sealed class DocumentRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudentId { get; set; }
    public Guid AssignedCuratorId { get; set; }
    [MaxLength(40)] public string GroupCode { get; set; } = "";
    [MaxLength(30)] public string Kind { get; set; } = "";
    [MaxLength(200)] public string Purpose { get; set; } = "";
    [MaxLength(20)] public string Status { get; set; } = States.Requested;
    [MaxLength(800)] public string? Comment { get; set; }
    public DateTimeOffset RequestedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? IssuedAt { get; set; }
    public Guid? IssuerId { get; set; }
    public Guid? CaseId { get; set; }
    [ConcurrencyCheck] public int Revision { get; set; } = 1;
}
public sealed class DualCase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudentId { get; set; }
    public Guid MentorId { get; set; }
    public Guid CuratorId { get; set; }
    public Guid DocumentRequestId { get; set; }
    [MaxLength(40)] public string GroupCode { get; set; } = "";
    [MaxLength(40)] public string CompanyCode { get; set; } = "";
    [MaxLength(20)] public string Status { get; set; } = States.CompanyReview;
    [MaxLength(1200)] public string Motivation { get; set; } = "";
    [MaxLength(1200)] public string? Decision { get; set; }
    public bool Consent { get; set; }
    public int PlanVersion { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
    [ConcurrencyCheck] public int Revision { get; set; } = 1;
}
public sealed class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CaseId { get; set; }
    [MaxLength(40)] public string OutcomeId { get; set; } = "";
    public int Version { get; set; }
    [MaxLength(30)] public string Status { get; set; } = States.Submitted;
    [ConcurrencyCheck] public int Revision { get; set; } = 1;
}
public sealed class ReportRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReportId { get; set; }
    public int Version { get; set; }
    public double Hours { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    [MaxLength(3000)] public string Summary { get; set; } = "";
    [MaxLength(2000)] public string Evidence { get; set; } = "";
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class ReportDecision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReportId { get; set; }
    public int Version { get; set; }
    public Guid ReviewerId { get; set; }
    [MaxLength(20)] public string Role { get; set; } = "";
    [MaxLength(10)] public string Decision { get; set; } = "";
    [MaxLength(800)] public string Comment { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class StoredFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReportRevisionId { get; set; }
    [MaxLength(180)] public string FileName { get; set; } = "";
    [MaxLength(100)] public string ContentType { get; set; } = "";
    [MaxLength(64)] public string Sha256 { get; set; } = "";
    [MaxLength(100)] public string StorageKey { get; set; } = "";
    public long Length { get; set; }
}
public sealed class AuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ActorId { get; set; }
    [MaxLength(20)] public string ResourceType { get; set; } = "";
    public Guid ResourceId { get; set; }
    [MaxLength(50)] public string Action { get; set; } = "";
    [MaxLength(1000)] public string Note { get; set; } = "";
    public int? Version { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}
