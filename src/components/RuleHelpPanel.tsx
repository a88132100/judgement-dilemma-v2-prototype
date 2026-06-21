export function RuleHelpPanel() {
  return (
    <details className="panel rule-help-panel">
      <summary>規則提示</summary>
      <div className="rule-help-grid">
        <div>
          <h2>MVP 重點</h2>
          <ul>
            <li>11 點勝利。</li>
            <li>0 點出局。</li>
            <li>守諾 +1。</li>
            <li>失信 -1。</li>
            <li>每回合選擇合作或背叛。</li>
            <li>每回合最多使用 1 張功能牌。</li>
          </ul>
        </div>
        <div>
          <h2>功能牌</h2>
          <ul>
            <li>宿命：發言後、出牌前宣告；命中 +2，落空 -1。</li>
            <li>真理之眼：查看一名玩家的暗放陣營。</li>
            <li>庇護：合作時減少基礎損失。</li>
            <li>反擊：合作被背叛時，使一名背叛者 -1。</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
