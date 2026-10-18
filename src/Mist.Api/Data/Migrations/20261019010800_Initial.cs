using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
namespace Mist.Api.Data.Migrations;
[DbContext(typeof(MistDb))]
[Migration("20261019010800_Initial")]
public sealed class Initial : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
CREATE TABLE "Users" (
 "Id" uuid PRIMARY KEY, "UserName" varchar(120) NOT NULL, "DisplayName" varchar(150) NOT NULL,
 "Role" varchar(20) NOT NULL, "GroupCode" varchar(40) NOT NULL, "CompanyCode" varchar(40) NOT NULL,
 "Active" boolean NOT NULL, "PasswordHash" text NOT NULL);
CREATE UNIQUE INDEX "IX_Users_UserName" ON "Users" ("UserName");
CREATE TABLE "Documents" (
 "Id" uuid PRIMARY KEY, "StudentId" uuid NOT NULL REFERENCES "Users"("Id"),
 "AssignedCuratorId" uuid NOT NULL REFERENCES "Users"("Id"),
 "GroupCode" varchar(40) NOT NULL, "Kind" varchar(30) NOT NULL, "Purpose" varchar(200) NOT NULL,
 "Status" varchar(20) NOT NULL, "Comment" varchar(800), "RequestedAt" timestamptz NOT NULL,
 "IssuedAt" timestamptz, "IssuerId" uuid REFERENCES "Users"("Id"), "CaseId" uuid, "Revision" integer NOT NULL);
CREATE INDEX "IX_Documents_StudentId_Status" ON "Documents" ("StudentId", "Status");
CREATE UNIQUE INDEX "IX_Documents_Student_Pending" ON "Documents" ("StudentId", "Kind") WHERE "Status" IN ('requested', 'processing');
CREATE TABLE "Cases" (
 "Id" uuid PRIMARY KEY, "StudentId" uuid NOT NULL REFERENCES "Users"("Id"),
 "MentorId" uuid NOT NULL REFERENCES "Users"("Id"), "CuratorId" uuid NOT NULL REFERENCES "Users"("Id"),
 "DocumentRequestId" uuid NOT NULL REFERENCES "Documents"("Id"),
 "GroupCode" varchar(40) NOT NULL, "CompanyCode" varchar(40) NOT NULL,
 "Status" varchar(20) NOT NULL, "Motivation" varchar(1200) NOT NULL, "Decision" varchar(1200),
 "Consent" boolean NOT NULL, "PlanVersion" integer NOT NULL, "CreatedAt" timestamptz NOT NULL,
 "CompletedAt" timestamptz, "Revision" integer NOT NULL);
CREATE UNIQUE INDEX "IX_Cases_StudentId" ON "Cases" ("StudentId");
CREATE INDEX "IX_Cases_MentorId" ON "Cases" ("MentorId");
CREATE INDEX "IX_Cases_CuratorId" ON "Cases" ("CuratorId");
CREATE TABLE "Reports" (
 "Id" uuid PRIMARY KEY, "CaseId" uuid NOT NULL REFERENCES "Cases"("Id"),
 "OutcomeId" varchar(40) NOT NULL, "Version" integer NOT NULL,
 "Status" varchar(30) NOT NULL, "Revision" integer NOT NULL);
CREATE UNIQUE INDEX "IX_Reports_CaseId_OutcomeId" ON "Reports" ("CaseId", "OutcomeId");
CREATE TABLE "ReportRevisions" (
 "Id" uuid PRIMARY KEY, "ReportId" uuid NOT NULL REFERENCES "Reports"("Id"),
 "Version" integer NOT NULL, "Hours" double precision NOT NULL, "FromDate" date NOT NULL,
 "ToDate" date NOT NULL, "Summary" varchar(3000) NOT NULL, "Evidence" varchar(2000) NOT NULL,
 "SubmittedAt" timestamptz NOT NULL);
CREATE UNIQUE INDEX "IX_ReportRevisions_ReportId_Version" ON "ReportRevisions" ("ReportId", "Version");
CREATE TABLE "Decisions" (
 "Id" uuid PRIMARY KEY, "ReportId" uuid NOT NULL REFERENCES "Reports"("Id"),
 "Version" integer NOT NULL, "ReviewerId" uuid NOT NULL REFERENCES "Users"("Id"),
 "Role" varchar(20) NOT NULL, "Decision" varchar(10) NOT NULL, "Comment" varchar(800) NOT NULL,
 "CreatedAt" timestamptz NOT NULL);
CREATE TABLE "Files" (
 "Id" uuid PRIMARY KEY, "ReportRevisionId" uuid NOT NULL REFERENCES "ReportRevisions"("Id"),
 "FileName" varchar(180) NOT NULL, "ContentType" varchar(100) NOT NULL,
 "Sha256" varchar(64) NOT NULL, "StorageKey" varchar(100) NOT NULL, "Length" bigint NOT NULL);
CREATE UNIQUE INDEX "IX_Files_ReportRevisionId" ON "Files" ("ReportRevisionId");
CREATE TABLE "AuditEvents" (
 "Id" uuid PRIMARY KEY, "ActorId" uuid NOT NULL REFERENCES "Users"("Id"),
 "ResourceType" varchar(20) NOT NULL, "ResourceId" uuid NOT NULL,
 "Action" varchar(50) NOT NULL, "Note" varchar(1000) NOT NULL,
 "Version" integer, "At" timestamptz NOT NULL);
CREATE INDEX "IX_AuditEvents_ResourceType_ResourceId" ON "AuditEvents" ("ResourceType", "ResourceId");
""");
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
DROP TABLE IF EXISTS "AuditEvents";
DROP TABLE IF EXISTS "Files";
DROP TABLE IF EXISTS "Decisions";
DROP TABLE IF EXISTS "ReportRevisions";
DROP TABLE IF EXISTS "Reports";
DROP TABLE IF EXISTS "Cases";
DROP TABLE IF EXISTS "Documents";
DROP TABLE IF EXISTS "Users";
""");
    }
}
