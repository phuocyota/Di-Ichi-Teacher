import React from "react";
import "./lesson-mascot.css";

export default function LessonMascot({
  type = "robot",
  motion = "none",
  className = "",
}) {
  if (type === "none") return null;
  return (
    <span
      className={"lp-mascot-art " + className}
      data-motion={motion}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 180" fill="none" focusable="false">
        <ellipse cx="80" cy="169" rx="40" ry="6" fill="#324f7720" />
        {type === "robot" ? (
          <>
            <rect
              x="48"
              y="90"
              width="64"
              height="61"
              rx="21"
              fill="#6f9fdb"
              stroke="#456fa6"
              strokeWidth="3"
            />
            <rect
              x="57"
              y="104"
              width="46"
              height="30"
              rx="10"
              fill="#dcecff"
            />
            <circle cx="70" cy="118" r="5" fill="#ffc866" />
            <circle cx="88" cy="118" r="5" fill="#94cdbd" />
            <rect x="55" y="143" width="19" height="20" rx="7" fill="#466eaa" />
            <rect x="86" y="143" width="19" height="20" rx="7" fill="#466eaa" />
            <path
              d="M80 30V18"
              stroke="#527bac"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="80" cy="14" r="7" fill="#ffca79" />
            <rect
              x="38"
              y="31"
              width="84"
              height="65"
              rx="24"
              fill="#e0efff"
              stroke="#739bc8"
              strokeWidth="3"
            />
            <rect x="48" y="43" width="64" height="38" rx="15" fill="#405e8d" />
            <circle
              className="lp-mascot-eye"
              cx="65"
              cy="59"
              r="5"
              fill="#ddf5ff"
            />
            <circle
              className="lp-mascot-eye"
              cx="95"
              cy="59"
              r="5"
              fill="#ddf5ff"
            />
            <path
              d="M71 70Q80 78 89 70"
              stroke="#a1d9e4"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M47 104Q28 111 31 132"
              stroke="#6f9fdb"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <g className="lp-mascot-arm">
              <path
                d="M113 107Q137 105 132 78"
                stroke="#6f9fdb"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <circle cx="130" cy="73" r="10" fill="#ffd18b" />
            </g>
          </>
        ) : type === "cat" ? (
          <>
            <path
              d="M108 142Q150 150 139 115"
              stroke="#eaa364"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <ellipse cx="80" cy="124" rx="37" ry="37" fill="#edb47b" />
            <ellipse cx="80" cy="130" rx="23" ry="26" fill="#ffedd6" />
            <path
              d="M41 60 43 25 67 40M94 40 119 25 121 64"
              fill="#edb47b"
              stroke="#c9905d"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M49 43 49 35 60 43M103 44 114 35 114 47" fill="#eeb8ae" />
            <ellipse cx="80" cy="68" rx="44" ry="36" fill="#f5c490" />
            <path
              d="m72 34 2 10m8-11 1 11m8-8-1 10"
              stroke="#d89b62"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              className="lp-mascot-eye"
              d="M55 65q6-8 12 0M94 65q6-8 12 0"
              stroke="#6f5145"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="m75 75 5 5 5-5" fill="#d68282" />
            <path
              d="M80 80q-9 11-14 2m14-2q9 11 14 2"
              stroke="#9d6d54"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="m42 76-13-3m13 10-12 3m88-10 13-3m-13 10 12 3"
              stroke="#bd895e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="m59 101 21 12 21-12-4 17H64Z" fill="#7eadd3" />
            <rect x="53" y="149" width="24" height="15" rx="7" fill="#e4a66d" />
            <rect x="85" y="149" width="24" height="15" rx="7" fill="#e4a66d" />
            <g className="lp-mascot-arm">
              <path
                d="M111 119q28-10 16-30"
                stroke="#edb47b"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <ellipse cx="124" cy="86" rx="10" ry="12" fill="#f5c490" />
              <ellipse cx="124" cy="85" rx="4" ry="5" fill="#edafa5" />
            </g>
          </>
        ) : (
          <>
            <rect
              x="44"
              y="90"
              width="72"
              height="61"
              rx="22"
              fill="#e1eaf6"
              stroke="#9eb5d3"
              strokeWidth="3"
            />
            <rect x="57" y="108" width="46" height="26" rx="8" fill="#a7c4e8" />
            <circle cx="70" cy="120" r="5" fill="#eaaa75" />
            <path
              d="M82 118h12m-12 6h8"
              stroke="#eef7ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect x="53" y="145" width="22" height="20" rx="7" fill="#8ba9d0" />
            <rect x="85" y="145" width="22" height="20" rx="7" fill="#8ba9d0" />
            <circle
              cx="80"
              cy="59"
              r="43"
              fill="#f2f6fd"
              stroke="#afc6e2"
              strokeWidth="3"
            />
            <rect x="45" y="37" width="70" height="48" rx="24" fill="#5573a4" />
            <path
              d="M54 51q9-12 22-10"
              stroke="#a7c9ed"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle
              className="lp-mascot-eye"
              cx="66"
              cy="60"
              r="4"
              fill="#f0f8ff"
            />
            <circle
              className="lp-mascot-eye"
              cx="94"
              cy="60"
              r="4"
              fill="#f0f8ff"
            />
            <path
              d="M72 72q8 7 16 0"
              stroke="#d5eaff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M46 110q-18 2-18 24"
              stroke="#dce7f6"
              strokeWidth="15"
              strokeLinecap="round"
            />
            <g className="lp-mascot-arm">
              <path
                d="M115 109q24-8 16-32"
                stroke="#dce7f6"
                strokeWidth="15"
                strokeLinecap="round"
              />
              <ellipse cx="129" cy="72" rx="10" ry="12" fill="#9db9dc" />
            </g>
            <path d="m131 22 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#ffcc79" />
          </>
        )}
      </svg>
    </span>
  );
}
