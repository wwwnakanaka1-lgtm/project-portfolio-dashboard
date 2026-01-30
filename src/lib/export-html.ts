import { Project, Categories } from "./types";
import { getExchangeRate } from "./exchange-rate";

// Fallback rate if API fails
const FALLBACK_RATE = 150;

export async function exportToHTML(projects: Project[], categories: Categories): Promise<void> {
  // Fetch current exchange rate
  const rateInfo = await getExchangeRate();
  const USD_TO_JPY = rateInfo.rate;
  const rateSource = rateInfo.source === "api" ? "自動取得" : "フォールバック";
  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const categoryCount = Object.keys(categories).length;
  const techSet = new Set(projects.flatMap((p) => p.technologies));
  const techCount = techSet.size;

  // Group by category
  const projectsByCategory: Record<string, Project[]> = {};
  for (const project of projects) {
    if (!projectsByCategory[project.category]) {
      projectsByCategory[project.category] = [];
    }
    projectsByCategory[project.category].push(project);
  }

  // Tech usage
  const techUsage: Record<string, number> = {};
  for (const project of projects) {
    for (const tech of project.technologies) {
      techUsage[tech] = (techUsage[tech] || 0) + 1;
    }
  }
  const topTech = Object.entries(techUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Category stats for pie chart
  const categoryStats = Object.entries(projectsByCategory)
    .map(([id, projs]) => ({
      id,
      name: categories[id]?.name || id,
      color: categories[id]?.color || "#667eea",
      count: projs.length,
      percentage: ((projs.length / totalProjects) * 100).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);

  // Fetch usage stats from API (JSONL direct read)
  let usageStats = {
    totalCost: 0,
    totalCostJPY: 0,
    totalTokens: 0,
    totalSessions: 0,
    totalMessages: 0,
    models: [] as { name: string; cost: number; costJPY: number; percentage: number }[],
  };

  try {
    const response = await fetch("/api/usage-stats");
    if (response.ok) {
      const data = await response.json();
      const models = Object.entries(data.modelUsage as Record<string, { cost: number }>)
        .sort((a, b) => b[1].cost - a[1].cost)
        .map(([model, usage]) => {
          // Determine model name from model ID
          let name: string;
          if (model.includes("opus")) {
            name = "Opus 4.5";
          } else if (model.includes("sonnet")) {
            name = "Sonnet 4.5";
          } else if (model.includes("haiku")) {
            name = "Haiku 4.5";
          } else if (model === "<synthetic>") {
            name = "Synthetic (System)";
          } else {
            name = model;
          }
          return {
            name,
            cost: Math.round(usage.cost * 100) / 100,
            costJPY: Math.round(usage.cost * USD_TO_JPY),
            percentage: Math.round((usage.cost / data.totalCost) * 1000) / 10,
          };
        });

      usageStats = {
        totalCost: Math.round(data.totalCost * 100) / 100,
        totalCostJPY: Math.round(data.totalCost * USD_TO_JPY),
        totalTokens: data.totalTokens,
        totalSessions: data.totalSessions,
        totalMessages: data.totalMessages,
        models,
      };
    }
  } catch (err) {
    console.warn("Failed to fetch usage stats for export:", err);
  }

  // Generate pie chart SVG
  const generatePieChart = () => {
    let cumulativePercent = 0;
    const paths = categoryStats.map((cat) => {
      const percent = cat.count / totalProjects;
      const startAngle = cumulativePercent * 2 * Math.PI;
      cumulativePercent += percent;
      const endAngle = cumulativePercent * 2 * Math.PI;

      const x1 = Math.cos(startAngle - Math.PI / 2) * 80;
      const y1 = Math.sin(startAngle - Math.PI / 2) * 80;
      const x2 = Math.cos(endAngle - Math.PI / 2) * 80;
      const y2 = Math.sin(endAngle - Math.PI / 2) * 80;
      const largeArc = percent > 0.5 ? 1 : 0;

      return `<path d="M 0 0 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${cat.color}" />`;
    }).join("");

    return `<svg viewBox="-100 -100 200 200" width="200" height="200">${paths}</svg>`;
  };

  // Generate relationship data
  const generateRelationshipInfo = () => {
    const relationships: { from: string; to: string; tech: string }[] = [];
    const projectList = projects.filter(p => p.status === "active");

    for (let i = 0; i < projectList.length; i++) {
      for (let j = i + 1; j < projectList.length; j++) {
        const commonTech = projectList[i].technologies.filter(t =>
          projectList[j].technologies.includes(t)
        );
        if (commonTech.length >= 2) {
          relationships.push({
            from: projectList[i].name,
            to: projectList[j].name,
            tech: commonTech.slice(0, 3).join(", "),
          });
        }
      }
    }
    return relationships.slice(0, 15);
  };

  const relationships = generateRelationshipInfo();

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Portfolio Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
      color: #333;
      line-height: 1.6;
    }
    .slide {
      min-height: 100vh;
      padding: 40px 60px;
      page-break-after: always;
      background: white;
      border-bottom: 1px solid #eee;
    }
    .slide-title {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .slide-title h1 { font-size: 3.5rem; margin-bottom: 20px; }
    .slide-title .subtitle { font-size: 1.5rem; opacity: 0.9; margin-bottom: 30px; }
    .slide-title .date { font-size: 1.1rem; opacity: 0.7; }

    h2 {
      font-size: 2rem;
      color: #1a1a2e;
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 12px;
      padding: 25px;
      text-align: center;
      color: white;
    }
    .stat-card .number { font-size: 2.5rem; font-weight: bold; }
    .stat-card .label { font-size: 0.9rem; opacity: 0.9; margin-top: 5px; }

    .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .three-column { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }

    .chart-box {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 25px;
    }
    .chart-box h3 {
      font-size: 1.2rem;
      color: #333;
      margin-bottom: 20px;
    }

    .pie-container {
      display: flex;
      align-items: center;
      gap: 30px;
    }
    .pie-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }

    .bar-chart { display: flex; flex-direction: column; gap: 10px; }
    .bar-item { display: flex; align-items: center; gap: 10px; }
    .bar-label { width: 100px; font-size: 0.85rem; text-align: right; }
    .bar-track {
      flex: 1;
      height: 24px;
      background: #e9ecef;
      border-radius: 12px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      color: white;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .project-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .project-table th {
      background: #667eea;
      color: white;
      padding: 12px 15px;
      text-align: left;
    }
    .project-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }
    .project-table tr:nth-child(even) { background: #f8f9fa; }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: bold;
    }
    .status-active { background: #d4edda; color: #155724; }
    .status-archive { background: #e9ecef; color: #495057; }

    .tech-tag {
      display: inline-block;
      padding: 2px 8px;
      background: #e9ecef;
      border-radius: 10px;
      font-size: 0.75rem;
      margin: 2px;
    }

    .cost-card {
      background: linear-gradient(135deg, #11998e, #38ef7d);
      border-radius: 12px;
      padding: 30px;
      color: white;
      text-align: center;
    }
    .cost-card .amount { font-size: 3rem; font-weight: bold; }
    .cost-card .label { font-size: 1rem; opacity: 0.9; }

    .model-breakdown {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 20px;
    }
    .model-item {
      background: white;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .model-name { font-weight: bold; color: #333; }
    .model-cost { font-size: 1.2rem; color: #11998e; font-weight: bold; }

    .relationship-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .relationship-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      border-left: 4px solid #667eea;
    }
    .relationship-projects {
      font-size: 0.9rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .relationship-tech {
      font-size: 0.8rem;
      color: #666;
    }

    .footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 0.9rem;
      background: #f8f9fa;
    }

    @media print {
      .slide { page-break-after: always; }
      body { background: white; }
    }
  </style>
</head>
<body>
  <!-- Slide 1: Title -->
  <div class="slide slide-title">
    <h1>Project Portfolio Report</h1>
    <p class="subtitle">C:\\Users\\wwwhi\\Create プロジェクト一覧</p>
    <p class="date">${dateStr}</p>
  </div>

  <!-- Slide 2: Overview -->
  <div class="slide">
    <h2>概要サマリー</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${totalProjects}</div>
        <div class="label">プロジェクト総数</div>
      </div>
      <div class="stat-card">
        <div class="number">${activeProjects}</div>
        <div class="label">アクティブ</div>
      </div>
      <div class="stat-card">
        <div class="number">${categoryCount}</div>
        <div class="label">カテゴリ</div>
      </div>
      <div class="stat-card">
        <div class="number">${techCount}</div>
        <div class="label">技術スタック</div>
      </div>
    </div>

    <div class="two-column">
      <div class="chart-box">
        <h3>カテゴリ別分布</h3>
        <div class="pie-container">
          ${generatePieChart()}
          <div class="pie-legend">
            ${categoryStats.map(cat => `
              <div class="legend-item">
                <div class="legend-color" style="background: ${cat.color}"></div>
                <span>${cat.name} (${cat.count})</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="chart-box">
        <h3>技術スタック Top 10</h3>
        <div class="bar-chart">
          ${topTech.map(([tech, count], i) => {
            const percentage = (count / Math.max(...topTech.map(t => t[1]))) * 100;
            const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#ffa751', '#ffe259'];
            return `
            <div class="bar-item">
              <div class="bar-label">${tech}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${percentage}%; background: ${colors[i % colors.length]}">${count}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- Slide 3: Usage & Cost -->
  <div class="slide">
    <h2>Claude Code 使用量・コスト</h2>
    <div class="three-column">
      <div class="cost-card">
        <div class="amount">$${usageStats.totalCost.toLocaleString()}</div>
        <div style="font-size: 1.5rem; opacity: 0.9;">¥${usageStats.totalCostJPY.toLocaleString()}</div>
        <div class="label">推定総コスト</div>
      </div>
      <div class="cost-card" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
        <div class="amount">${(usageStats.totalTokens / 1_000_000).toFixed(0)}M</div>
        <div class="label">総トークン数</div>
      </div>
      <div class="cost-card" style="background: linear-gradient(135deg, #667eea, #764ba2);">
        <div class="amount">${usageStats.totalMessages.toLocaleString()}</div>
        <div class="label">メッセージ数</div>
      </div>
    </div>

    <div class="chart-box" style="margin-top: 30px;">
      <h3>モデル別コスト内訳</h3>
      <div class="model-breakdown">
        ${usageStats.models.map(model => `
          <div class="model-item">
            <div>
              <div class="model-name">${model.name}</div>
              <div style="font-size: 0.85rem; color: #666;">${model.percentage}% of total</div>
            </div>
            <div style="text-align: right;">
              <div class="model-cost">$${model.cost.toLocaleString()}</div>
              <div style="font-size: 0.9rem; color: #666;">¥${model.costJPY.toLocaleString()}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: 15px; font-size: 0.8rem; color: #888; text-align: right;">為替レート: $1 = ¥${USD_TO_JPY} (${rateSource})</div>
    </div>
  </div>

  <!-- Slide 4: Relationships -->
  <div class="slide">
    <h2>プロジェクト関係性</h2>
    <p style="margin-bottom: 20px; color: #666;">共通技術スタック（2つ以上）でつながるプロジェクト</p>
    <div class="relationship-list">
      ${relationships.map(rel => `
        <div class="relationship-card">
          <div class="relationship-projects">${rel.from}</div>
          <div style="font-size: 0.8rem; color: #667eea; margin: 5px 0;">↔</div>
          <div class="relationship-projects">${rel.to}</div>
          <div class="relationship-tech">共通: ${rel.tech}</div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Slide 5: Project Table -->
  <div class="slide">
    <h2>プロジェクト一覧</h2>
    <table class="project-table">
      <thead>
        <tr>
          <th>プロジェクト名</th>
          <th>カテゴリ</th>
          <th>状態</th>
          <th>技術スタック</th>
        </tr>
      </thead>
      <tbody>
        ${projects.slice(0, 20).map(project => `
          <tr>
            <td><strong>${project.name}</strong><br><span style="font-size: 0.8rem; color: #666;">${project.description.slice(0, 50)}...</span></td>
            <td>${categories[project.category]?.name || project.category}</td>
            <td><span class="status-badge status-${project.status}">${project.status === 'active' ? 'Active' : 'Archive'}</span></td>
            <td>${project.technologies.slice(0, 4).map(t => `<span class="tech-tag">${t}</span>`).join('')}${project.technologies.length > 4 ? `<span class="tech-tag">+${project.technologies.length - 4}</span>` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${projects.length > 20 ? `<p style="margin-top: 15px; color: #666; font-size: 0.9rem;">...他 ${projects.length - 20} プロジェクト</p>` : ''}
  </div>

  <!-- Slide 6: Category Details -->
  ${Object.entries(projectsByCategory).sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([catId, catProjects]) => {
    const cat = categories[catId];
    return `
    <div class="slide">
      <h2 style="border-color: ${cat?.color || '#667eea'}">${cat?.name || catId} (${catProjects.length} projects)</h2>
      <div class="three-column">
        ${catProjects.slice(0, 6).map(project => `
          <div class="chart-box" style="border-left: 4px solid ${cat?.color || '#667eea'}">
            <h3 style="margin-bottom: 10px;">${project.name}</h3>
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">${project.description}</p>
            <div>${project.technologies.slice(0, 5).map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('')}

  <!-- Footer -->
  <div class="footer">
    Project Portfolio Dashboard | Generated: ${dateStr} | Total: ${totalProjects} projects
  </div>
</body>
</html>`;

  // Download
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project-portfolio-report.html";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
