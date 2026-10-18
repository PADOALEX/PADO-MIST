using System.Security.Cryptography;
using Mist.Api.Domain;
namespace Mist.Api.Storage;
public sealed class PrivateFiles(IConfiguration config)
{
    public const long MaxBytes = 600 * 1024;
    private readonly string root = Path.GetFullPath(config["MIST_FILE_DIR"] ?? Path.Combine(AppContext.BaseDirectory, "private-uploads"));
    public async Task<StoredFile?> SaveAsync(IFormFile? file, Guid revisionId, CancellationToken ct)
    {
        if (file is null) return null;
        Workflow.Require(file.Length is > 0 and <= MaxBytes, "File exceeds 600 KiB or is empty.");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        Workflow.Require(ext is ".pdf" or ".png" or ".jpg" or ".jpeg" or ".txt" or ".md" or ".csv", "Unsupported file type.");
        await using var input = file.OpenReadStream();
        using var ms = new MemoryStream();
        await input.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        Workflow.Require(bytes.LongLength == file.Length && bytes.Length <= MaxBytes, "File size mismatch.");
        bool valid = ext switch
        {
            ".pdf" => bytes.AsSpan().StartsWith("%PDF-"u8),
            ".png" => bytes.AsSpan().StartsWith(new byte[] { 137,80,78,71,13,10,26,10 }),
            ".jpg" or ".jpeg" => bytes.Length >= 4 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[^2] == 0xff && bytes[^1] == 0xd9,
            _ => !bytes.Contains((byte)0) && IsUtf8(bytes)
        };
        Workflow.Require(valid, "File content does not match an allowed type.");
        Directory.CreateDirectory(root);
        var key = Guid.NewGuid().ToString("N");
        await File.WriteAllBytesAsync(Path.Combine(root, key), bytes, ct);
        return new StoredFile
        {
            ReportRevisionId = revisionId,
            StorageKey = key,
            FileName = Path.GetFileName(file.FileName).Length > 180 ? Path.GetFileName(file.FileName)[..180] : Path.GetFileName(file.FileName),
            ContentType = ext switch { ".pdf" => "application/pdf", ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", _ => "text/plain" },
            Length = bytes.LongLength,
            Sha256 = Convert.ToHexString(SHA256.HashData(bytes))
        };
    }
    private static bool IsUtf8(byte[] data)
    {
        try { _ = new System.Text.UTF8Encoding(false, true).GetString(data); return true; }
        catch (System.Text.DecoderFallbackException) { return false; }
    }
    public string FullPath(StoredFile item) => Path.Combine(root, item.StorageKey);
    public void Delete(StoredFile? item)
    {
        if (item is not null && File.Exists(FullPath(item))) File.Delete(FullPath(item));
    }
}
