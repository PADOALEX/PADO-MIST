using Microsoft.EntityFrameworkCore;
using Mist.Api.Domain;
namespace Mist.Api.Data;
public sealed class MistDb(DbContextOptions<MistDb> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<DocumentRequest> Documents => Set<DocumentRequest>();
    public DbSet<DualCase> Cases => Set<DualCase>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ReportRevision> ReportRevisions => Set<ReportRevision>();
    public DbSet<ReportDecision> Decisions => Set<ReportDecision>();
    public DbSet<StoredFile> Files => Set<StoredFile>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AppUser>().HasIndex(x => x.UserName).IsUnique();
        b.Entity<DocumentRequest>().HasIndex(x => new { x.StudentId, x.Status });
        b.Entity<DualCase>().HasIndex(x => x.StudentId).IsUnique();
        b.Entity<DualCase>().HasIndex(x => x.MentorId);
        b.Entity<DualCase>().HasIndex(x => x.CuratorId);
        b.Entity<Report>().HasIndex(x => new { x.CaseId, x.OutcomeId }).IsUnique();
        b.Entity<ReportRevision>().HasIndex(x => new { x.ReportId, x.Version }).IsUnique();
        b.Entity<StoredFile>().HasIndex(x => x.ReportRevisionId).IsUnique();
        b.Entity<AuditEvent>().HasIndex(x => new { x.ResourceType, x.ResourceId });
        // Explicit FK metadata ensures EF Core inserts parents before their dependants.
        b.Entity<DocumentRequest>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DocumentRequest>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.AssignedCuratorId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DocumentRequest>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.IssuerId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DualCase>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DualCase>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.MentorId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DualCase>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.CuratorId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DualCase>().HasOne<DocumentRequest>().WithMany().HasForeignKey(x => x.DocumentRequestId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Report>().HasOne<DualCase>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<ReportRevision>().HasOne<Report>().WithMany().HasForeignKey(x => x.ReportId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<ReportDecision>().HasOne<Report>().WithMany().HasForeignKey(x => x.ReportId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<ReportDecision>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.ReviewerId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<StoredFile>().HasOne<ReportRevision>().WithMany().HasForeignKey(x => x.ReportRevisionId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<AuditEvent>().HasOne<AppUser>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<DocumentRequest>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<DualCase>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<Report>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<ReportRevision>().Property(x => x.FromDate).HasColumnType("date");
        b.Entity<ReportRevision>().Property(x => x.ToDate).HasColumnType("date");
    }
}
