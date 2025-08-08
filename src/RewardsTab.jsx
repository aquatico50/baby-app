import React from "react";

const RewardsTab = ({ tab, points, showCoupons, setShowCoupons, coupons, useCoupon, REWARDS, redeem }) => {
  return (
    tab === "rewards" && (
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div className="task-meta">
            Your points: <strong>{points}</strong>
          </div>
          <button className="menu-btn" onClick={() => setShowCoupons((v) => !v)}>
            {showCoupons ? "← Back to Rewards" : "🎟 Open Coupon Box"}
          </button>
        </div>

        {/* Coupon Box */}
        {showCoupons ? (
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Your Coupons</div>
            {coupons.length === 0 ? (
              <div className="task-meta">No coupons yet. Redeem a reward to add one here.</div>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: 8,
                }}
              >
                {coupons
                  .slice()
                  .reverse()
                  .map((c) => (
                    <li key={c.id} className={`coupon coupon--held coupon--${c.tier.toLowerCase()}`}>
                      <span className="fx-stars"></span>
                      <span className="fx-sheen"></span>
                      <span className="cut" aria-hidden="true"></span>

                      <div className="coupon-content">
                        <div>
                          <div className="title">{c.label}</div>
                          <div className="task-meta">
                            Earned {new Date(c.date).toLocaleString()}
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          <div className="badge">{c.cost} pts</div>
                          <button className="btn" onClick={() => useCoupon(c.id)}>
                            Use
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="card" style={{ display: "grid", gap: 14 }}>
            {["Small", "Medium", "Large", "Special"].map((tier) => {
              const list = REWARDS.filter((r) => r.tier === tier);
              return (
                <div key={tier} className="card" style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{tier} Rewards</div>
                  {list.map((r) => (
                    <div key={r.key} className={`coupon coupon--${r.tier.toLowerCase()}`}>
                      <span className="fx-stars"></span>
                      <span className="fx-sheen"></span>
                      <span className="cut" aria-hidden="true"></span>

                      <div className="coupon-content">
                        <div>
                          <div className="title">{r.label}</div>
                          <div className="tier">{r.tier} · Earned with points</div>
                        </div>

                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          <div className="badge">{r.cost} pts</div>
                          <button
                            className="btn"
                            disabled={points < r.cost}
                            onClick={() => redeem(r)}
                            style={{ opacity: points < r.cost ? 0.5 : 1 }}
                            aria-label={`Redeem ${r.label}`}
                          >
                            Redeem
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>
    )
  );
};

export default RewardsTab;
