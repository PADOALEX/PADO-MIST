using Mist.Api.Domain;
using Xunit;
namespace Mist.Api.Tests;
public class WorkflowTests
{
    [Fact] public void DocumentQueue_EnforcesOrdering()
    {
        var d = new DocumentRequest();
        Assert.Throws<WorkflowException>(() => Workflow.TransitionDocument(d, "issue"));
        Workflow.TransitionDocument(d, "process");
        Workflow.TransitionDocument(d, "issue");
        Assert.Equal(States.Ready, d.Status);
        Assert.Throws<WorkflowException>(() => Workflow.TransitionDocument(d, "cancel"));
    }
    [Fact] public void Rejections_RequireAllowedSourceState()
    {
        var d = new DocumentRequest();
        Workflow.TransitionDocument(d, "reject");
        Assert.Throws<WorkflowException>(() => Workflow.TransitionDocument(d, "process"));
    }
    [Fact] public void Case_RequiresEveryOutcome()
    {
        var c = new DualCase();
        Assert.Throws<WorkflowException>(() => Workflow.TransitionCase(c, "approve-plan"));
        Workflow.TransitionCase(c, "accept");
        Workflow.TransitionCase(c, "approve-plan");
        Assert.Throws<WorkflowException>(() => Workflow.TransitionCase(c, "complete"));
        Workflow.TransitionCase(c, "complete", true);
        Assert.Equal(States.Completed, c.Status);
    }
    [Fact] public void ReportReview_ReturnsToNewVersion_AndNeverSkipsMentor()
    {
        var r = new Report();
        Workflow.Submit(r, null);
        Assert.Throws<WorkflowException>(() => Workflow.Review(r, Roles.Curator, "approve", 1, true));
        Workflow.Review(r, Roles.Mentor, "approve", 1, true);
        Workflow.Review(r, Roles.Curator, "return", 1, false);
        Assert.Throws<WorkflowException>(() => Workflow.Submit(r, 0));
        Workflow.Submit(r, 1);
        Assert.Equal(2, r.Version);
        Assert.Throws<WorkflowException>(() => Workflow.Review(r, Roles.Mentor, "approve", 1, true));
        Assert.Throws<WorkflowException>(() => Workflow.Review(r, Roles.Curator, "approve", 2, true));
        Workflow.Review(r, Roles.Mentor, "approve", 2, true);
        Workflow.Review(r, Roles.Curator, "approve", 2, true);
        Assert.Equal(States.Accepted, r.Status);
    }
    [Fact] public void Confirmation_IsMandatory()
    {
        var r = new Report(); Workflow.Submit(r, null);
        Assert.Throws<WorkflowException>(() => Workflow.Review(r, Roles.Mentor, "approve", 1, false));
        Assert.Equal(States.Submitted, r.Status);
    }
    [Fact] public void StudentCannotReviewReport()
    {
        var r = new Report(); Workflow.Submit(r, null);
        Assert.Throws<WorkflowException>(() => Workflow.Review(r, Roles.Student, "approve", 1, true));
    }
}
