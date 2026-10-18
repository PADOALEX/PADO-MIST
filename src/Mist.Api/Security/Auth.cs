using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Mist.Api.Data;
using Mist.Api.Domain;

namespace Mist.Api.Security;

public static class Auth
{
    public static Guid UserId(this ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException());
    public static string UserRole(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Role) ?? "";
    public static string Token(AppUser user, string key)
    {
        var handler = new JwtSecurityTokenHandler();
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddMinutes(60),
            Issuer = "PADO.MIST",
            Audience = "PADO.MIST.Web",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256)
        };
        return handler.WriteToken(handler.CreateToken(descriptor));
    }
    public static async Task SeedDemoAsync(MistDb db, string? password)
    {
        if (string.IsNullOrEmpty(password)) throw new InvalidOperationException("MIST_DEMO_PASSWORD must be configured when demo seeding is enabled.");
        if (password.Length < 12) throw new InvalidOperationException("Demo password must be at least 12 characters.");
        if (await db.Users.AnyAsync()) return;
        var hasher = new PasswordHasher<AppUser>();
        foreach (var (name, role, group, company) in new[] { ("demo.student", Roles.Student, "DEMO-31", ""), ("demo.mentor", Roles.Mentor, "DEMO-31", "DEMO-COMPANY"), ("demo.curator", Roles.Curator, "DEMO-31", ""), ("demo.student2", Roles.Student, "DEMO-OTHER", ""), ("demo.mentor2", Roles.Mentor, "DEMO-OTHER", "DEMO-OTHER-COMPANY"), ("demo.curator2", Roles.Curator, "DEMO-OTHER", "") })
        {
            var u = new AppUser { UserName = name, Role = role, DisplayName = name, GroupCode = group, CompanyCode = company };
            u.PasswordHash = hasher.HashPassword(u, password);
            db.Users.Add(u);
        }
        await db.SaveChangesAsync();
    }
    public static void MapAuth(this WebApplication app)
    {
        app.MapPost("/api/auth/login", async (LoginRequest request, MistDb db, IConfiguration config) =>
        {
            var user = await db.Users.SingleOrDefaultAsync(x => x.UserName == request.UserName && x.Active);
            var valid = user is not null && new PasswordHasher<AppUser>().VerifyHashedPassword(user, user.PasswordHash, request.Password ?? "") != PasswordVerificationResult.Failed;
            if (!valid) return Results.Unauthorized();
            return Results.Ok(new { accessToken = Token(user!, config["MIST_JWT_KEY"]!), expiresInSeconds = 3600, role = user!.Role, displayName = user.DisplayName });
        }).RequireRateLimiting("login");
        app.MapGet("/api/auth/me", async (ClaimsPrincipal actor, MistDb db) =>
        {
            var user = await db.Users.FindAsync(actor.UserId());
            return user is null || !user.Active ? Results.Unauthorized() : Results.Ok(new { user.Id, user.UserName, user.DisplayName, user.Role });
        }).RequireAuthorization();
    }
}
public sealed record LoginRequest(string UserName, string? Password);
