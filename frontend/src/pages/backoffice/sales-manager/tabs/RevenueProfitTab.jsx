import React, { useState, useMemo } from "react";
import { listInvoicesByDateRange, getRevenueProfit } from "../../../../lib/api";

export default function RevenueProfitTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("day"); // "day" | "week" | "month"

  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    // Allow empty, partial dates (e.g., "2025", "2025-01", "2025-01-01"), or full YYYY-MM-DD format
    if (value === "" || /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/.test(value)) {
      setStartDate(value);
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    // Allow empty, partial dates (e.g., "2025", "2025-01", "2025-01-01"), or full YYYY-MM-DD format
    if (value === "" || /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/.test(value)) {
      setEndDate(value);
    }
  };

  const handleFetchData = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch invoices
      const invoicesResponse = await listInvoicesByDateRange(startDate, endDate);
      const invoicesData = invoicesResponse.data || [];
      
      const transformedInvoices = invoicesData.map((inv) => ({
        id: inv.orderId || inv.id,
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "",
        totalAmount: inv.grandTotal ? Number(inv.grandTotal) : 0,
      }));

      setInvoices(transformedInvoices);

      // Fetch revenue/profit data for charts
      const revenueResponse = await getRevenueProfit(startDate, endDate, groupBy);
      setRevenueData(revenueResponse.data);
    } catch (err) {
      console.error("Error fetching revenue data", err);
      setError(
        err.response?.data?.message || "Could not load revenue data."
      );
    } finally {
      setLoading(false);
    }
  };

  // Revenue / cost / profit summary
  const revenueSummary = useMemo(() => {
    if (revenueData) {
      return {
        totalRevenue: Number(revenueData.revenue || 0),
        totalCost: Number(revenueData.cost || 0),
        profit: Number(revenueData.profit || 0),
      };
    }

    if (!invoices.length) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
      };
    }

    let totalRevenue = 0;
    let totalCost = 0;

    invoices.forEach((inv) => {
      const invoiceTotal = Number(inv.totalAmount ?? inv.total ?? inv.totalPrice ?? 0);
      totalRevenue += invoiceTotal;
      // Default cost = 50% of sale price
      totalCost += invoiceTotal * 0.5;
    });

    const profit = totalRevenue - totalCost;

    return { totalRevenue, totalCost, profit };
  }, [invoices, revenueData]);

  // Chart data: use backend series if available, otherwise calculate from invoices
  const chartData = useMemo(() => {
    if (revenueData && revenueData.series && revenueData.series.length > 0) {
      return revenueData.series.map((point) => ({
        date: point.bucket,
        revenue: Number(point.revenue || 0),
        cost: Number(point.cost || 0),
        profit: Number(point.profit || 0),
      }));
    }

    if (!invoices.length) return [];

    const byDate = {};
    invoices.forEach((inv) => {
      const rawDate = inv.date || inv.createdAt || "";
      const day = rawDate.slice(0, 10); // YYYY-MM-DD
      const invoiceTotal = Number(inv.totalAmount ?? inv.total ?? inv.totalPrice ?? 0);
      if (!day) return;
      if (!byDate[day]) {
        byDate[day] = { revenue: 0, cost: 0 };
      }
      byDate[day].revenue += invoiceTotal;
      byDate[day].cost += invoiceTotal * 0.5; // 50% cost assumption
    });

    return Object.entries(byDate)
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
      }));
  }, [invoices, revenueData]);

  // Box plot data: revenue distribution
  const boxPlotData = useMemo(() => {
    if (!chartData.length) return null;

    const revenues = chartData.map((d) => d.revenue).filter(r => r > 0);
    if (revenues.length === 0) return null;
    revenues.sort((a, b) => a - b);

    const q1Index = Math.floor(revenues.length * 0.25);
    const medianIndex = Math.floor(revenues.length * 0.5);
    const q3Index = Math.floor(revenues.length * 0.75);

    return {
      min: revenues[0],
      q1: revenues[q1Index] || revenues[0],
      median: revenues[medianIndex] || revenues[0],
      q3: revenues[q3Index] || revenues[revenues.length - 1],
      max: revenues[revenues.length - 1],
      mean: revenues.reduce((a, b) => a + b, 0) / revenues.length,
    };
  }, [chartData]);

  // Pie chart data: revenue breakdown
  const pieChartData = useMemo(() => {
    if (!revenueSummary || revenueSummary.totalRevenue === 0) return null;

    return [
      {
        label: "Revenue",
        value: revenueSummary.totalRevenue,
        color: "#3d211c",
      },
      {
        label: "Cost",
        value: revenueSummary.totalCost,
        color: "#b91c1c",
      },
      {
        label: "Profit",
        value: Math.max(0, revenueSummary.profit),
        color: "#166534",
      },
    ];
  }, [revenueSummary]);

  // Line chart data for time series
  const maxValue = useMemo(() => {
    if (!chartData.length) return 1000;
    return Math.max(
      ...chartData.map(d => Math.max(d.revenue, d.profit)),
      1000
    );
  }, [chartData]);

  return (
    <div className="pm-tab" lang="en">
      <div className="pm-tab-header">
        <h1 className="pm-tab-title">Revenue & Profit Analysis</h1>
      </div>

      <p style={{ marginBottom: 24, color: "#666", fontSize: 14 }}>
        Calculate revenue, cost, and profit between given dates and view charts.
      </p>

      {/* Date range controls */}
      <div className="pm-form">
        <div className="pm-form-grid-2">
          <div className="pm-form-field">
            <label className="pm-label" htmlFor="rev-start">From</label>
            <input
              id="rev-start"
              className="pm-input"
              type="text"
              value={startDate}
              onChange={handleStartDateChange}
              placeholder="YYYY-MM-DD (e.g., 2025-01-01)"
              pattern="\d{4}-\d{2}-\d{2}"
            />
            <span style={{ fontSize: 12, color: "#7a7a7a", marginTop: 4, display: 'block' }}>
              Format: YYYY-MM-DD (e.g., 2025-01-01)
            </span>
          </div>

          <div className="pm-form-field">
            <label className="pm-label" htmlFor="rev-end">To</label>
            <input
              id="rev-end"
              className="pm-input"
              type="text"
              value={endDate}
              onChange={handleEndDateChange}
              placeholder="YYYY-MM-DD (e.g., 2025-12-31)"
              pattern="\d{4}-\d{2}-\d{2}"
            />
            <span style={{ fontSize: 12, color: "#7a7a7a", marginTop: 4, display: 'block' }}>
              Format: YYYY-MM-DD (e.g., 2025-12-31)
            </span>
          </div>
        </div>

        <div className="pm-form-field">
          <label className="pm-label" htmlFor="group-by">Group By</label>
          <select
            id="group-by"
            className="pm-input"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <div className="pm-tab-actions">
          <button
            type="button"
            className="pm-btn pm-btn-primary"
            onClick={handleFetchData}
            disabled={loading}
          >
            {loading ? "Loading..." : "Calculate Revenue & Profit"}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="pm-alert pm-alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {/* Summary */}
      {!loading && !error && (invoices.length > 0 || revenueData) && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 24,
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 6,
                background: "#f5f3f2",
                border: "1px solid #e5e5e5",
              }}
            >
              <strong>Total Revenue:</strong>{" "}
              ${revenueSummary.totalRevenue.toFixed(2)}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 6,
                background: "#f5f3f2",
                border: "1px solid #e5e5e5",
              }}
            >
              <strong>Total Cost (estimated):</strong>{" "}
              ${revenueSummary.totalCost.toFixed(2)}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 6,
                background:
                  revenueSummary.profit >= 0
                    ? "#ecfdf3"
                    : "#fef2f2",
                color:
                  revenueSummary.profit >= 0
                    ? "#166534"
                    : "#b91c1c",
                border: "1px solid",
                borderColor:
                  revenueSummary.profit >= 0
                    ? "#a7f3d0"
                    : "#fecdd3",
              }}
            >
              <strong>
                {revenueSummary.profit >= 0 ? "Profit" : "Loss"}:
              </strong>{" "}
              ${Math.abs(revenueSummary.profit).toFixed(2)}
            </div>
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div
              style={{
                marginTop: 24,
                marginBottom: 20,
                borderTop: "1px solid #e5e5e5",
                paddingTop: 24,
              }}
            >
              {/* Time Series Line Chart */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#3d211c" }}>
                  Revenue & Profit Over Time
                </h3>
                <div
                  style={{
                    position: "relative",
                    height: 300,
                    border: "1px solid #e5e5e5",
                    borderRadius: 6,
                    padding: 20,
                    background: "#fafafa",
                  }}
                >
                  <svg width="100%" height="100%" style={{ overflow: "visible" }}>
                    {/* Y-axis labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const value = maxValue * ratio;
                      const y = 280 - (ratio * 260);
                      return (
                        <g key={ratio}>
                          <line
                            x1="50"
                            y1={y}
                            x2="100%"
                            y2={y}
                            stroke="#e5e5e5"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                          <text
                            x="45"
                            y={y + 4}
                            fontSize="11"
                            fill="#666"
                            textAnchor="end"
                          >
                            ${(value / 1000).toFixed(1)}k
                          </text>
                        </g>
                      );
                    })}

                    {/* Revenue line */}
                    {chartData.length > 1 && chartData.map((point, index) => {
                      if (index === 0) return null;
                      const prev = chartData[index - 1];
                      const chartWidth = 800; // Fixed width for chart
                      const x1 = 60 + ((index - 1) / (chartData.length - 1)) * chartWidth;
                      const y1 = 280 - (prev.revenue / maxValue) * 260;
                      const x2 = 60 + (index / (chartData.length - 1)) * chartWidth;
                      const y2 = 280 - (point.revenue / maxValue) * 260;
                      return (
                        <line
                          key={`revenue-${index}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                      );
                    })}

                    {/* Profit line */}
                    {chartData.length > 1 && chartData.map((point, index) => {
                      if (index === 0) return null;
                      const prev = chartData[index - 1];
                      const chartWidth = 800; // Fixed width for chart
                      const x1 = 60 + ((index - 1) / (chartData.length - 1)) * chartWidth;
                      const y1 = 280 - (Math.max(0, prev.profit) / maxValue) * 260;
                      const x2 = 60 + (index / (chartData.length - 1)) * chartWidth;
                      const y2 = 280 - (Math.max(0, point.profit) / maxValue) * 260;
                      return (
                        <line
                          key={`profit-${index}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#166534"
                          strokeWidth="2"
                        />
                      );
                    })}

                    {/* Data points */}
                    {chartData.map((point, index) => {
                      const chartWidth = 800; // Fixed width for chart
                      const x = 60 + (index / (chartData.length - 1 || 1)) * chartWidth;
                      const yRevenue = 280 - (point.revenue / maxValue) * 260;
                      const yProfit = 280 - (Math.max(0, point.profit) / maxValue) * 260;
                      return (
                        <g key={`point-${index}`}>
                          <circle cx={x} cy={yRevenue} r="4" fill="#3d211c" />
                          <circle cx={x} cy={yProfit} r="4" fill="#166534" />
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{ marginTop: 12, fontSize: 12, color: "#666", display: "flex", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 2, background: "#3d211c" }} />
                      <span>Revenue</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 2, background: "#166534" }} />
                      <span>Profit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Plot and Pie Chart */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  marginBottom: 20,
                }}
              >
                {/* Box Plot */}
                {boxPlotData && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#555" }}>
                      Revenue Distribution (Box Plot)
                    </h3>
                    <div
                      style={{
                        position: "relative",
                        height: 200,
                        border: "1px solid #e5e5e5",
                        borderRadius: 6,
                        padding: 16,
                        background: "#fafafa",
                      }}
                    >
                      <svg width="100%" height="100%" style={{ overflow: "visible" }}>
                        {/* Y-axis */}
                        <line
                          x1="40"
                          y1="20"
                          x2="40"
                          y2="160"
                          stroke="#ccc"
                          strokeWidth="1"
                        />
                        {/* Box */}
                        <rect
                          x="60"
                          y={160 - ((boxPlotData.q3 / boxPlotData.max) * 120)}
                          width="80"
                          height={((boxPlotData.q3 - boxPlotData.q1) / boxPlotData.max) * 120}
                          fill="#3d211c"
                          opacity="0.3"
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                        {/* Median line */}
                        <line
                          x1="60"
                          y1={160 - ((boxPlotData.median / boxPlotData.max) * 120)}
                          x2="140"
                          y2={160 - ((boxPlotData.median / boxPlotData.max) * 120)}
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                        {/* Whiskers */}
                        <line
                          x1="100"
                          y1={160 - ((boxPlotData.min / boxPlotData.max) * 120)}
                          x2="100"
                          y2={160 - ((boxPlotData.q1 / boxPlotData.max) * 120)}
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                        <line
                          x1="100"
                          y1={160 - ((boxPlotData.q3 / boxPlotData.max) * 120)}
                          x2="100"
                          y2={160 - ((boxPlotData.max / boxPlotData.max) * 120)}
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                        {/* Min/Max markers */}
                        <line
                          x1="90"
                          y1={160 - ((boxPlotData.min / boxPlotData.max) * 120)}
                          x2="110"
                          y2={160 - ((boxPlotData.min / boxPlotData.max) * 120)}
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                        <line
                          x1="90"
                          y1={160 - ((boxPlotData.max / boxPlotData.max) * 120)}
                          x2="110"
                          y2={160 - ((boxPlotData.max / boxPlotData.max) * 120)}
                          stroke="#3d211c"
                          strokeWidth="2"
                        />
                      </svg>
                      <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>
                        <div>
                          Min: ${boxPlotData.min.toFixed(2)} | Q1: ${boxPlotData.q1.toFixed(2)} | Median: ${boxPlotData.median.toFixed(2)}
                        </div>
                        <div>
                          Q3: ${boxPlotData.q3.toFixed(2)} | Max: ${boxPlotData.max.toFixed(2)} | Mean: ${boxPlotData.mean.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pie Chart */}
                {pieChartData && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#555" }}>
                      Revenue Breakdown (Pie Chart)
                    </h3>
                    <div
                      style={{
                        position: "relative",
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="180" height="180" viewBox="0 0 200 200">
                        {(() => {
                          const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
                          let currentAngle = -90;
                          const radius = 70;
                          const centerX = 100;
                          const centerY = 100;

                          return pieChartData.map((item, index) => {
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            const angle = (percentage / 100) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;

                            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

                            const largeArcFlag = angle > 180 ? 1 : 0;

                            const pathData = [
                              `M ${centerX} ${centerY}`,
                              `L ${x1} ${y1}`,
                              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              "Z",
                            ].join(" ");

                            currentAngle += angle;

                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={item.color}
                                stroke="#fff"
                                strokeWidth="2"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {pieChartData.map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor: item.color,
                                borderRadius: 2,
                              }}
                            />
                            <span style={{ color: "#666" }}>
                              {item.label}: ${item.value.toFixed(2)} (
                              {revenueSummary.totalRevenue > 0
                                ? ((item.value / revenueSummary.totalRevenue) * 100).toFixed(1)
                                : 0}
                              %)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && (!startDate || !endDate) && (
        <p className="pm-empty" style={{ marginTop: 24 }}>
          Please select a date range to calculate revenue and profit.
        </p>
      )}

      {!loading && !error && startDate && endDate && invoices.length === 0 && !revenueData && (
        <p className="pm-empty" style={{ marginTop: 24 }}>
          No data found for this date range.
        </p>
      )}
    </div>
  );
}

