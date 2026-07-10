import { GameBadge, GameButton, GamePanel } from "@pieai/swimmer-ui-kit";

interface HelpScreenProps {
  readonly onBack: () => void;
}

export function HelpScreen({ onBack }: HelpScreenProps) {
  return (
    <div className="meta-screen help-screen" data-testid="help-screen">
      <header className="meta-header">
        <h1>操作与说明</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          返回
        </GameButton>
      </header>

      <GamePanel title="游玩" className="settings-panel">
        <ul className="help-list">
          <li>
            <GameBadge tone="ai">Space / Enter</GameBadge> 跳过打字机；继续节拍；跳过 CG
          </li>
          <li>
            <GameBadge tone="neutral">Esc</GameBadge> 关历史 → 关系统菜单 → 跳过 CG
          </li>
          <li>
            <GameBadge tone="success">点击对白</GameBadge> 立刻显示全文
          </li>
          <li>
            <GameBadge tone="warning">全屏</GameBadge> 顶栏按钮，16:9 舞台铺满
          </li>
        </ul>
      </GamePanel>

      <GamePanel title="AI 旁支（产品差异点）" className="settings-panel">
        <p className="meta-lead">
          部分关键选择会多出一个「灵感」槽：先显示「生成中…」，再变成 AI 写的第三条选项。
          选中后只播很短的旁支，然后<strong>强制回到作者写好的主线</strong>——不是无限 AI 小说。
        </p>
        <p className="meta-lead">
          旁支可用的背景 / 立绘来自<strong>作者白名单资产池</strong>（B7
          已加厚），不会自由联网生图。 无网络 / 无 key 时自动用本地 mock，仍可通关。
        </p>
      </GamePanel>

      <GamePanel title="双主角名字与立绘" className="settings-panel">
        <ul className="help-list">
          <li>
            <strong>设定 → 双主角名字</strong>：改名牌与对白称呼；剧本逻辑 ID 不变
          </li>
          <li>
            <strong>设定 → 本机立绘包</strong>：上传男主 / 女主覆盖图（仅本机）；配角不可改
          </li>
          <li>
            若启用了自定义立绘，官方正脸 Event CG 会<strong>自动跳过</strong>
            （避免「立绘是你、视频仍是官方脸」）
          </li>
        </ul>
      </GamePanel>

      <GamePanel title="同玩（本机 / 跨网）" className="settings-panel">
        <ul className="help-list">
          <li>标题 → 本机同玩：一方建房、一方输入房间码</li>
          <li>
            默认用<strong>同浏览器标签页</strong>；若配置了 Supabase Realtime 密钥，可跨设备同房
          </li>
          <li>房主跑剧情；客人围观，可点选项投票</li>
          <li>
            选项冲突 → <strong>石头剪刀布</strong>，或房主点「听全球的」用社区倾向裁判
          </li>
          <li>舞台光标互相可见；语音请用手机，产品不做语音房</li>
        </ul>
      </GamePanel>

      <GamePanel title="全球回声 / 预言家 / 分享" className="settings-panel">
        <ul className="help-list">
          <li>章末显示关键抉择「有多少玩家和你一样」</li>
          <li>
            关键分叉出现时，可先点<strong>预言家</strong>猜多数，结算揭晓命中
          </li>
          <li>少数派成就；一局 ≥3 次少数派 →「逆流订单」</li>
          <li>下载分享卡会带上百分比与主演名字</li>
        </ul>
      </GamePanel>

      <GamePanel title="存档与图鉴" className="settings-panel">
        <ul className="help-list">
          <li>自动存档：推进时写入 · 标题「继续最新」</li>
          <li>手动三槽：系统菜单 · 标题「读档 / 存档槽」</li>
          <li>图鉴：场景图 / 事件 CG / 音频解锁表随游玩增长</li>
        </ul>
      </GamePanel>

      <p className="meta-lead">
        SupaLuv · 第 1 章 demo · noncanonical · 成人黑色喜剧，不是色情生成器。
      </p>
    </div>
  );
}
