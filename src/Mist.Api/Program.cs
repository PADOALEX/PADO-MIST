using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Mist.Api.Data;
using Mist.Api.Domain;
using Mist.Api.Endpoints;
using Mist.Api.Security;
using Mist.Api.Storage;

var builder = WebApplication.CreateBuilder(args);
var jwtKey = builder.Configuration["MIST_JWT_KEY"] ?? throw new InvalidOperationException("MIST_JWT_KEY environment variable is required.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32) throw new InvalidOperationException("MIST_JWT_KEY must contain at least 32 bytes.");
var conn = builder.Configuration.GetConnectionString("Mist") ?? throw new InvalidOperationException("ConnectionStrings__Mist is required.");
builder.Services.AddDbContext<MistDb>(o => o.UseNpgsql(conn));
builder.Services.AddSingleton<PrivateFiles>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = true;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = "PADO.MIST",
        ValidateAudience = true, ValidAudience = "PADO.MIST.Web",
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
var app = builder.Build();
app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var error = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    ctx.Response.StatusCode = error is DbUpdateConcurrencyException ? 409 : 500;
    await Results.Problem(statusCode: ctx.Response.StatusCode, title: ctx.Response.StatusCode == 409 ? "Concurrent update" : "Internal server error").ExecuteAsync(ctx);
}));
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api") && !ctx.Request.Path.StartsWithSegments("/api/auth/login") && ctx.User.Identity?.IsAuthenticated == true)
    {
        using var scope = ctx.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MistDb>();
        var id = Mist.Api.Security.Auth.UserId(ctx.User);
        if (!await db.Users.AnyAsync(x => x.Id == id && x.Active))
        {
            ctx.Response.StatusCode = 401;
            return;
        }
    }
    await next();
});
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapAuth();
app.MapDocuments();
app.MapCases();
app.MapReports();
app.MapGet("/api/audit/{kind}/{id:guid}", async (string kind, Guid id, System.Security.Claims.ClaimsPrincipal actor, MistDb db) =>
{
    var visible = kind switch
    {
        "document" => await Helpers.VisibleDocuments(db, actor).AnyAsync(x => x.Id == id),
        "case" => await Helpers.VisibleCases(db, actor).AnyAsync(x => x.Id == id),
        "report" => await Helpers.VisibleReports(db, actor).AnyAsync(x => x.Id == id),
        _ => false
    };
    return visible ? Results.Ok(await db.AuditEvents.Where(x => x.ResourceType == kind && x.ResourceId == id).OrderBy(x => x.At).ToListAsync()) : Results.NotFound();
}).RequireAuthorization();

// All migrations must complete before accepting traffic, never create schema ad hoc in production.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MistDb>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("MIST_SEED_DEMO"))
        await Auth.SeedDemoAsync(db, builder.Configuration["MIST_DEMO_PASSWORD"]);
}
await app.RunAsync();
public partial class Program { }
