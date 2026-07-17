// Real geographic Brazil map (state boundaries from GeoJSON) with luminous
// dashed connection lines centered on Brasília hub.
import { BRAZIL_GEO_PATH } from "./brazilPath";

const HUB = { x: 391.1, y: 323.2 }; // Brasília

const points = [
  { id: "sp", name: "São Paulo · SP", x: 410.5, y: 441.3 },
  { id: "rj", name: "Rio de Janeiro · RJ", x: 462.4, y: 431.5 },
  { id: "bh", name: "Belo Horizonte · MG", x: 450.9, y: 386.1 },
  { id: "df", name: "Brasília · DF", x: 391.1, y: 323.2 },
  { id: "go", name: "Goiânia · GO", x: 371.2, y: 336.9 },
  { id: "ssa", name: "Salvador · BA", x: 532.5, y: 280.6 },
  { id: "rec", name: "Recife · PE", x: 586.5, y: 205.8 },
  { id: "for", name: "Fortaleza · CE", x: 532.2, y: 140.2 },
  { id: "man", name: "Manaus · AM", x: 209.7, y: 130.6 },
  { id: "bel", name: "Belém · PA", x: 382.5, y: 105.7 },
  { id: "poa", name: "Porto Alegre · RS", x: 341.6, y: 539.7 },
  { id: "cwb", name: "Curitiba · PR", x: 370.9, y: 469.8 },
  { id: "cgb", name: "Cuiabá · MT", x: 268.5, y: 320.5 },
];

export const BrazilMap = () => (
  <div className="relative max-w-4xl mx-auto">
    <svg viewBox="80 60 540 560" className="w-full h-auto" role="img" aria-label="Mapa do Brasil com pontos Multplick">
      <defs>
        <linearGradient id="brFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(215 85% 32%)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="hsl(220 70% 12%)" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Real Brazil map with state boundaries */}
      <path
        d={BRAZIL_GEO_PATH}
        fill="url(#brFill)"
        stroke="hsl(215 85% 60%)"
        strokeWidth="0.6"
        strokeLinejoin="round"
        opacity="0.95"
      />

      {/* Luminous dashed connection lines from Brasília hub */}
      {points
        .filter((p) => p.id !== "df")
        .map((p) => (
          <line
            key={`l-${p.id}`}
            x1={HUB.x}
            y1={HUB.y}
            x2={p.x}
            y2={p.y}
            stroke="hsl(215 90% 60%)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            opacity="0.65"
            filter="url(#glow)"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2.5s" repeatCount="indefinite" />
          </line>
        ))}

      {/* Points */}
      {points.map((p) => (
        <g key={p.id} filter="url(#glow)">
          <circle cx={p.x} cy={p.y} r="8" fill="hsl(215 90% 60%)" opacity="0.25">
            <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.05;0.35" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={p.x} cy={p.y} r="3.5" fill="hsl(0 0% 100%)" stroke="hsl(215 90% 60%)" strokeWidth="1.5" />
        </g>
      ))}
    </svg>

    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-primary-foreground/75">
      {points.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary-glow shadow-glow" />
          {p.name}
        </div>
      ))}
    </div>
  </div>
);