namespace Mist.Api.Domain;

public sealed class WorkflowException(string message) : Exception(message);

public static class Workflow
{
    public static readonly IReadOnlyDictionary<string, int> Outcomes = new Dictionary<string, int>
    {
        ["db"] = 16, ["import"] = 24, ["quality"] = 20
    };

    public static void Require(bool condition, string message)
    {
        if (!condition) throw new WorkflowException(message);
    }
    public static string Text(string? value, int min, int max)
    {
        var trimmed = value?.Trim() ?? "";
        Require(trimmed.Length >= min && trimmed.Length <= max, $"Text length must be {min}–{max}.");
        return trimmed;
    }
    public static void TransitionDocument(DocumentRequest doc, string action, bool studentActive = true)
    {
        var next = (doc.Status, action) switch
        {
            (States.Requested, "cancel") => States.Cancelled,
            (States.Requested, "process") => States.Processing,
            (States.Requested or States.Processing, "reject") => States.Rejected,
            (States.Processing, "issue") when studentActive => States.Ready,
            _ => throw new WorkflowException("Document transition is not allowed.")
        };
        doc.Status = next;
        doc.Revision++;
    }
    public static void TransitionCase(DualCase item, string action, bool allOutcomesAccepted = false)
    {
        item.Status = (item.Status, action) switch
        {
            (States.CompanyReview, "accept") => States.PlanReview,
            (States.PlanReview, "approve-plan") => States.Active,
            (States.Active, "complete") when allOutcomesAccepted => States.Completed,
            _ => throw new WorkflowException("Case transition is not allowed.")
        };
        item.Revision++;
    }
    public static void Submit(Report r, int? expectedVersion)
    {
        if (r.Version == 0)
        {
            Require(expectedVersion is null, "New report must not specify a version.");
            r.Version = 1;
        }
        else
        {
            Require(r.Status is States.MentorChanges or States.CuratorChanges, "Report is not awaiting changes.");
            Require(expectedVersion == r.Version, "Stale report version.");
            r.Version++;
        }
        r.Status = States.Submitted;
        r.Revision++;
    }
    public static void Review(Report r, string role, string decision, int expectedVersion, bool confirmed)
    {
        Require(r.Version == expectedVersion, "Stale report version.");
        Require(decision is "approve" or "return", "Invalid review decision.");
        Require(role is Roles.Mentor or Roles.Curator, "Reviewer role required.");
        Require(r.Status == (role == Roles.Mentor ? States.Submitted : States.UniversityReview), "Out-of-order review.");
        if (decision == "approve") Require(confirmed, "Explicit confirmation required.");
        r.Status = decision == "return"
            ? (role == Roles.Mentor ? States.MentorChanges : States.CuratorChanges)
            : (role == Roles.Mentor ? States.UniversityReview : States.Accepted);
        r.Revision++;
    }
}
