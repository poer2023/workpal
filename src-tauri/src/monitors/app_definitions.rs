use super::{AppCategory, AppInfo};
use std::collections::HashMap;

/// 创建默认的应用注册表
/// 使用 macOS bundle ID 作为 key
pub fn default_app_registry() -> HashMap<String, AppInfo> {
    let mut registry = HashMap::new();

    // === 开发工具 ===
    registry.insert(
        "com.microsoft.VSCode".to_string(),
        AppInfo::new("VS Code", AppCategory::Development),
    );
    registry.insert(
        "com.microsoft.VSCodeInsiders".to_string(),
        AppInfo::new("VS Code Insiders", AppCategory::Development),
    );
    registry.insert(
        "com.apple.dt.Xcode".to_string(),
        AppInfo::new("Xcode", AppCategory::Development),
    );
    registry.insert(
        "com.googlecode.iterm2".to_string(),
        AppInfo::new("iTerm2", AppCategory::Development),
    );
    registry.insert(
        "com.apple.Terminal".to_string(),
        AppInfo::new("Terminal", AppCategory::Development),
    );
    registry.insert(
        "com.jetbrains.intellij".to_string(),
        AppInfo::new("IntelliJ IDEA", AppCategory::Development),
    );
    registry.insert(
        "com.jetbrains.WebStorm".to_string(),
        AppInfo::new("WebStorm", AppCategory::Development),
    );
    registry.insert(
        "com.jetbrains.pycharm".to_string(),
        AppInfo::new("PyCharm", AppCategory::Development),
    );
    registry.insert(
        "com.jetbrains.goland".to_string(),
        AppInfo::new("GoLand", AppCategory::Development),
    );
    registry.insert(
        "com.jetbrains.CLion".to_string(),
        AppInfo::new("CLion", AppCategory::Development),
    );
    registry.insert(
        "com.jetbrains.rustrover".to_string(),
        AppInfo::new("RustRover", AppCategory::Development),
    );
    registry.insert(
        "com.sublimetext.4".to_string(),
        AppInfo::new("Sublime Text", AppCategory::Development),
    );
    registry.insert(
        "com.github.atom".to_string(),
        AppInfo::new("Atom", AppCategory::Development),
    );
    registry.insert(
        "dev.zed.Zed".to_string(),
        AppInfo::new("Zed", AppCategory::Development),
    );
    registry.insert(
        "com.todesktop.230313mzl4w4u92".to_string(),
        AppInfo::new("Cursor", AppCategory::Development),
    );

    // === 创意工具 ===
    registry.insert(
        "com.adobe.Photoshop".to_string(),
        AppInfo::new("Photoshop", AppCategory::Creative),
    );
    registry.insert(
        "com.adobe.illustrator".to_string(),
        AppInfo::new("Illustrator", AppCategory::Creative),
    );
    registry.insert(
        "com.adobe.Premiere".to_string(),
        AppInfo::new("Premiere Pro", AppCategory::Creative),
    );
    registry.insert(
        "com.adobe.AfterEffects".to_string(),
        AppInfo::new("After Effects", AppCategory::Creative),
    );
    registry.insert(
        "com.figma.Desktop".to_string(),
        AppInfo::new("Figma", AppCategory::Creative),
    );
    registry.insert(
        "com.bohemiancoding.sketch3".to_string(),
        AppInfo::new("Sketch", AppCategory::Creative),
    );
    registry.insert(
        "com.apple.FinalCut".to_string(),
        AppInfo::new("Final Cut Pro", AppCategory::Creative),
    );
    registry.insert(
        "com.apple.LogicPro".to_string(),
        AppInfo::new("Logic Pro", AppCategory::Creative),
    );
    registry.insert(
        "com.pixelmatorteam.pixelmator.x".to_string(),
        AppInfo::new("Pixelmator Pro", AppCategory::Creative),
    );
    registry.insert(
        "com.affinity.designer2".to_string(),
        AppInfo::new("Affinity Designer", AppCategory::Creative),
    );
    registry.insert(
        "com.affinity.photo2".to_string(),
        AppInfo::new("Affinity Photo", AppCategory::Creative),
    );

    // === 通讯工具 ===
    registry.insert(
        "com.electron.lark".to_string(),
        AppInfo::new("飞书", AppCategory::Communication),
    );
    registry.insert(
        "com.tencent.WeWorkMac".to_string(),
        AppInfo::new("企业微信", AppCategory::Communication),
    );
    registry.insert(
        "com.tencent.xinWeChat".to_string(),
        AppInfo::new("微信", AppCategory::Communication),
    );
    registry.insert(
        "com.alibaba.DingTalkMac".to_string(),
        AppInfo::new("钉钉", AppCategory::Communication),
    );
    registry.insert(
        "com.tinyspeck.slackmacgap".to_string(),
        AppInfo::new("Slack", AppCategory::Communication),
    );
    registry.insert(
        "com.microsoft.teams2".to_string(),
        AppInfo::new("Microsoft Teams", AppCategory::Communication),
    );
    registry.insert(
        "com.hnc.Discord".to_string(),
        AppInfo::new("Discord", AppCategory::Communication),
    );
    registry.insert(
        "ru.keepcoder.Telegram".to_string(),
        AppInfo::new("Telegram", AppCategory::Communication),
    );

    // === 会议工具 ===
    registry.insert("us.zoom.xos".to_string(), AppInfo::meeting("Zoom"));
    registry.insert(
        "com.microsoft.teams2".to_string(),
        AppInfo::meeting("Microsoft Teams"),
    );
    registry.insert(
        "com.google.meet".to_string(),
        AppInfo::meeting("Google Meet"),
    );
    registry.insert(
        "com.cisco.webexmeetingsapp".to_string(),
        AppInfo::meeting("Webex"),
    );
    registry.insert(
        "com.electron.lark.meeting".to_string(),
        AppInfo::meeting("飞书会议"),
    );
    registry.insert(
        "com.tencent.meeting".to_string(),
        AppInfo::meeting("腾讯会议"),
    );

    // === 生产力工具 ===
    registry.insert(
        "md.obsidian".to_string(),
        AppInfo::new("Obsidian", AppCategory::Productivity),
    );
    registry.insert(
        "notion.id".to_string(),
        AppInfo::new("Notion", AppCategory::Productivity),
    );
    registry.insert(
        "com.microsoft.Word".to_string(),
        AppInfo::new("Microsoft Word", AppCategory::Productivity),
    );
    registry.insert(
        "com.microsoft.Excel".to_string(),
        AppInfo::new("Microsoft Excel", AppCategory::Productivity),
    );
    registry.insert(
        "com.microsoft.Powerpoint".to_string(),
        AppInfo::new("Microsoft PowerPoint", AppCategory::Productivity),
    );
    registry.insert(
        "com.apple.iWork.Pages".to_string(),
        AppInfo::new("Pages", AppCategory::Productivity),
    );
    registry.insert(
        "com.apple.iWork.Numbers".to_string(),
        AppInfo::new("Numbers", AppCategory::Productivity),
    );
    registry.insert(
        "com.apple.iWork.Keynote".to_string(),
        AppInfo::new("Keynote", AppCategory::Productivity),
    );
    registry.insert(
        "com.apple.Notes".to_string(),
        AppInfo::new("Notes", AppCategory::Productivity),
    );
    registry.insert(
        "com.craft.craft".to_string(),
        AppInfo::new("Craft", AppCategory::Productivity),
    );
    registry.insert(
        "com.linear".to_string(),
        AppInfo::new("Linear", AppCategory::Productivity),
    );

    // === 浏览器 ===
    registry.insert(
        "com.apple.Safari".to_string(),
        AppInfo::new("Safari", AppCategory::Browser),
    );
    registry.insert(
        "com.google.Chrome".to_string(),
        AppInfo::new("Chrome", AppCategory::Browser),
    );
    registry.insert(
        "org.mozilla.firefox".to_string(),
        AppInfo::new("Firefox", AppCategory::Browser),
    );
    registry.insert(
        "com.microsoft.edgemac".to_string(),
        AppInfo::new("Edge", AppCategory::Browser),
    );
    registry.insert(
        "company.thebrowser.Browser".to_string(),
        AppInfo::new("Arc", AppCategory::Browser),
    );
    registry.insert(
        "com.brave.Browser".to_string(),
        AppInfo::new("Brave", AppCategory::Browser),
    );

    registry
}

/// 根据进程名匹配应用
/// 用于 sysinfo 进程检测
pub fn process_name_to_bundle_id(process_name: &str) -> Option<&'static str> {
    match process_name.to_lowercase().as_str() {
        "code" | "code helper" => Some("com.microsoft.VSCode"),
        "xcode" => Some("com.apple.dt.Xcode"),
        "iterm2" => Some("com.googlecode.iterm2"),
        "terminal" => Some("com.apple.Terminal"),
        "photoshop" => Some("com.adobe.Photoshop"),
        "illustrator" => Some("com.adobe.illustrator"),
        "figma" => Some("com.figma.Desktop"),
        "sketch" => Some("com.bohemiancoding.sketch3"),
        "zoom" | "zoom.us" => Some("us.zoom.xos"),
        "slack" => Some("com.tinyspeck.slackmacgap"),
        "discord" => Some("com.hnc.Discord"),
        "telegram" => Some("ru.keepcoder.Telegram"),
        "wechat" => Some("com.tencent.xinWeChat"),
        "lark" | "feishu" => Some("com.electron.lark"),
        "dingtalk" => Some("com.alibaba.DingTalkMac"),
        "obsidian" => Some("md.obsidian"),
        "notion" => Some("notion.id"),
        "safari" => Some("com.apple.Safari"),
        "google chrome" | "chrome" => Some("com.google.Chrome"),
        "firefox" => Some("org.mozilla.firefox"),
        "microsoft edge" => Some("com.microsoft.edgemac"),
        "arc" => Some("company.thebrowser.Browser"),
        "cursor" => Some("com.todesktop.230313mzl4w4u92"),
        "zed" => Some("dev.zed.Zed"),
        _ => None,
    }
}
