namespace SmsBus.Web.Common;

/// <summary>预定义国家列表，供管理端下拉选择</summary>
public static class CountryPresets
{
    public static readonly object[] All = new object[]
    {
        // 欧洲
        new { code = "FR", name = "法国" }, new { code = "DE", name = "德国" },
        new { code = "UK", name = "英国" }, new { code = "ES", name = "西班牙" },
        new { code = "IT", name = "意大利" }, new { code = "NL", name = "荷兰" },
        new { code = "SE", name = "瑞典" }, new { code = "PL", name = "波兰" },
        new { code = "RO", name = "罗马尼亚" }, new { code = "CZ", name = "捷克" },
        new { code = "PT", name = "葡萄牙" }, new { code = "AT", name = "奥地利" },
        new { code = "BE", name = "比利时" }, new { code = "CH", name = "瑞士" },
        new { code = "IE", name = "爱尔兰" }, new { code = "DK", name = "丹麦" },
        new { code = "NO", name = "挪威" }, new { code = "FI", name = "芬兰" },
        new { code = "GR", name = "希腊" }, new { code = "HU", name = "匈牙利" },
        new { code = "HR", name = "克罗地亚" }, new { code = "RS", name = "塞尔维亚" },
        new { code = "BG", name = "保加利亚" }, new { code = "SK", name = "斯洛伐克" },
        new { code = "SI", name = "斯洛文尼亚" }, new { code = "LV", name = "拉脱维亚" },
        new { code = "LT", name = "立陶宛" }, new { code = "EE", name = "爱沙尼亚" },
        new { code = "LU", name = "卢森堡" }, new { code = "MT", name = "马耳他" },
        new { code = "CY", name = "塞浦路斯" },
        // 独联体
        new { code = "RU", name = "俄罗斯" }, new { code = "UA", name = "乌克兰" },
        new { code = "KZ", name = "哈萨克斯坦" }, new { code = "BY", name = "白俄罗斯" },
        new { code = "MD", name = "摩尔多瓦" }, new { code = "GE", name = "格鲁吉亚" },
        new { code = "AM", name = "亚美尼亚" }, new { code = "AZ", name = "阿塞拜疆" },
        new { code = "UZ", name = "乌兹别克斯坦" }, new { code = "TJ", name = "塔吉克斯坦" },
        new { code = "KG", name = "吉尔吉斯斯坦" },
        // 北美
        new { code = "US", name = "美国" }, new { code = "CA", name = "加拿大" },
        new { code = "MX", name = "墨西哥" },
        // 南美
        new { code = "BR", name = "巴西" }, new { code = "AR", name = "阿根廷" },
        new { code = "CO", name = "哥伦比亚" }, new { code = "CL", name = "智利" },
        new { code = "PE", name = "秘鲁" },
        // 东亚
        new { code = "CN", name = "中国" }, new { code = "HK", name = "香港" },
        new { code = "TW", name = "台湾" }, new { code = "JP", name = "日本" },
        new { code = "KR", name = "韩国" }, new { code = "MN", name = "蒙古" },
        // 东南亚
        new { code = "ID", name = "印尼" }, new { code = "PH", name = "菲律宾" },
        new { code = "TH", name = "泰国" }, new { code = "VN", name = "越南" },
        new { code = "MY", name = "马来西亚" }, new { code = "SG", name = "新加坡" },
        new { code = "MM", name = "缅甸" }, new { code = "KH", name = "柬埔寨" },
        new { code = "LA", name = "老挝" },
        // 南亚
        new { code = "IN", name = "印度" }, new { code = "PK", name = "巴基斯坦" },
        new { code = "BD", name = "孟加拉" }, new { code = "LK", name = "斯里兰卡" },
        new { code = "NP", name = "尼泊尔" },
        // 大洋洲
        new { code = "AU", name = "澳大利亚" }, new { code = "NZ", name = "新西兰" },
        // 中东
        new { code = "TR", name = "土耳其" }, new { code = "IL", name = "以色列" },
        new { code = "AE", name = "阿联酋" }, new { code = "SA", name = "沙特阿拉伯" },
        new { code = "IQ", name = "伊拉克" }, new { code = "IR", name = "伊朗" },
        // 非洲
        new { code = "EG", name = "埃及" }, new { code = "NG", name = "尼日利亚" },
        new { code = "ZA", name = "南非" }, new { code = "KE", name = "肯尼亚" },
        new { code = "GH", name = "加纳" }, new { code = "MA", name = "摩洛哥" },
        new { code = "TN", name = "突尼斯" },
    };
}
