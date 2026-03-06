using SmsBus.Web.Dto;
using StackExchange.Redis;

namespace SmsBus.Web.Endpoints;

public static class CaptchaEndpoints
{
    public static void MapCaptchaEndpoints(this WebApplication app)
    {
        app.MapGet("/api/captcha", async (IConnectionMultiplexer redis) =>
        {
            var db = redis.GetDatabase(3);
            var token = Guid.NewGuid().ToString("N")[..16];
            var seed = Random.Shared.Next(10000, 99999);
            var targetX = Random.Shared.Next(62, 240);
            var targetY = Random.Shared.Next(20, 88);

            await db.StringSetAsync($"captcha:{token}", targetX.ToString(), TimeSpan.FromMinutes(2));

            var xHi = (byte)((targetX >> 8) ^ (byte)token[0]);
            var xLo = (byte)((targetX & 0xFF) ^ (byte)token[1]);
            var data = Convert.ToBase64String(new[] { xHi, xLo });

            return Results.Ok(new { token, seed, y = targetY, data });
        });

        app.MapPost("/api/captcha/verify", async (CaptchaVerifyRequest req, IConnectionMultiplexer redis) =>
        {
            var db = redis.GetDatabase(3);
            var key = $"captcha:{req.Token}";
            var stored = await db.StringGetAsync(key);
            if (stored.IsNullOrEmpty)
                return Results.Json(new { verified = false, error = "验证码已过期" }, statusCode: 400);

            await db.KeyDeleteAsync(key);
            var targetX = int.Parse(stored!);

            if (Math.Abs(req.X - targetX) > 5)
                return Results.Json(new { verified = false, error = "验证失败" }, statusCode: 400);

            var verifiedToken = Guid.NewGuid().ToString("N")[..16];
            await db.StringSetAsync($"captcha_ok:{verifiedToken}", "1", TimeSpan.FromMinutes(5));

            return Results.Ok(new { verified = true, verifiedToken });
        });
    }
}
