/* NEX 站点配置：改这里就能改全站地址、线路和社交链接 */
window.NEX = {
  name: "Nexserver",
  ip: "nexserver.top",
  port: "25565",
  version: "Velocity 1.7.2-26.3",
  // 全部线路，前端会逐条实时查询在线状态
  routes: [
    { label: "主线路 · 湖北武汉", ip: "nexserver.top", main: true },
    { label: "备线① · 上海", ip: "nexmc.nexserver.top" },
    { label: "备线② · 北京", ip: "mc.nexserver.top" }
  ],
  // 在线人数 / 版本查询（公网 MOTD 接口）
  statusAPI: "https://motd.minebbs.com/api/status",
  statusInterval: 20000,
  hostInterval: 15000,
  social: {
    qqGroup: { url: "https://qm.qq.com/q/x8kxgKFgQg", number: "277897347" },
    telegram: { url: "https://t.me/nexservermc", name: "@nexservermc" },
    bilibili: { url: "https://space.bilibili.com/3546754060388730" },
    wiki: "https://github.com/Nexservermc/nexserver/wiki"
  },
  // 首页随机语录（社区里的原话）
  quotes: [
    "如果你帮助别人，别人也会帮助你",
    "支持你认为值得的社区",
    "成功的团队往往不会忘记初心",
    "如果你心情不好，那就忘掉过去的事",
    "今天世界上有很多好事正在发生",
    "背后夸奖人人敬仰；背后吐槽人人唾弃",
    "寓鼓励于赞美之中",
    "长篇的道理不如一句真诚的夸奖",
    "人没有高低贵贱之分，只有能力范围不同",
    "工人是伟大的，劳动创造世界",
    "看人不顺眼，是因自己情商不够",
    "和不同的人交往要用不同的方式",
    "体谅他人内心的想法，你会赢得尊重",
    "如果你理解别人身上的某种品质，说明你也具有这种品质",
    "常常为他人着想，你是个温柔的人",
    "赞美别人的细微之处总是会让他们特别高兴",
    "善于成事的人总是先观察再行动",
    "如果你愿意做好事，那起码要付诸行动",
    "温柔优雅的谈吐会让人觉得你十分亲近",
    "不要因为猜疑链绷断你们的友谊，勇敢地去面对他",
    "勇气是人类的赞歌",
    "满分 10 分你对服务器打几分？11 分！",
    "服务器开放海外玩家进入，欢迎加入 Telegram 的 Nexserver",
    "服务器开支爆表，主要浪费在宣传上",
    "NEXserver — Join us now!"
  ]
};
