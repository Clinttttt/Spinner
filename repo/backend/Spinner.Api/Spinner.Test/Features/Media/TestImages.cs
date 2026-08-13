using System.Text;

namespace Spinner.Test.Features.Media;

/// <summary>
/// Byte fixtures with genuine file headers.
/// </summary>
/// <remarks>
/// Real headers followed by filler, rather than decodable images: the code under test reads
/// the signature and the length and nothing else, so a fixture that only satisfies those is
/// honest about what is being checked. Each is padded past the minimum accepted size so a
/// size rule never fails a test that is about something else.
/// </remarks>
internal static class TestImages
{
    private const int Padding = 128;

    public static byte[] Png() => WithPadding([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    public static byte[] Jpeg() => WithPadding([0xFF, 0xD8, 0xFF, 0xE0]);

    public static byte[] Webp()
    {
        var header = new byte[12];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(header, 0);
        Encoding.ASCII.GetBytes("WEBP").CopyTo(header, 8);

        return WithPadding(header);
    }

    private static byte[] WithPadding(byte[] header)
    {
        var content = new byte[header.Length + Padding];
        header.CopyTo(content, 0);

        return content;
    }
}
