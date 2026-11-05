"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { GIFEncoder, quantize, applyPalette } from "gifenc";

type Season =
  | "spring"
  | "easter"
  | "summer"
  | "autumn"
  | "halloween"
  | "christmas";

const presets: {
  id: Season;
  label: string;
  emoji: string;
}[] = [
  { id: "spring", label: "Primavera", emoji: "🌼" },
  { id: "easter", label: "Pasqua", emoji: "🥚" },
  { id: "summer", label: "Estate", emoji: "☀️" },
  { id: "autumn", label: "Autunno", emoji: "🍂" },
  { id: "halloween", label: "Halloween", emoji: "🦇" },
  { id: "christmas", label: "Natale", emoji: "❄️" },
];

const sizes = {
  small: 200,
  medium: 300,
  large: 400,
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [season, setSeason] = useState<Season>("christmas");
  const [width, setWidth] = useState(300);
  const [isExporting, setIsExporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* =========================================================
     UPLOAD PNG
     ========================================================= */

  function loadPNG(file: File) {
    if (file.type !== "image/png") {
      alert("Carica un file PNG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Il file PNG non può superare 5 MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setImage(img);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Non è stato possibile leggere il PNG.");
    };

    img.src = url;
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    loadPNG(file);
    event.target.value = "";
  }

  /* =========================================================
     DRAG & DROP
     ========================================================= */

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    loadPNG(file);
  }

  /* =========================================================
     CANVAS
     ========================================================= */

  function canvasHeight() {
    if (!image) return 200;

    return Math.round(width * (image.height / image.width));
  }

  function drawFrame(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    if (!image) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0, w, h);

    switch (season) {
      case "spring":
        drawSpring(ctx, w, h, time);
        break;

      case "easter":
        drawEaster(ctx, w, h, time);
        break;

      case "summer":
        drawSummer(ctx, w, h, time);
        break;

      case "autumn":
        drawAutumn(ctx, w, h, time);
        break;

      case "halloween":
        drawHalloween(ctx, w, h, time);
        break;

      case "christmas":
        drawChristmas(ctx, w, h, time);
        break;
    }
  }

  /* =========================================================
     LIVE PREVIEW
     ========================================================= */

  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const h = canvasHeight();

    canvas.width = width;
    canvas.height = h;

    const start = performance.now();

    function animate(now: number) {
      drawFrame(ctx!, width, h, now - start);
      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [image, season, width]);

  /* =========================================================
     EXPORT PNG
     ========================================================= */

  function downloadPNG() {
    if (!image) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const link = document.createElement("a");

    link.download = `firma-${season}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  /* =========================================================
     EXPORT GIF
     ========================================================= */

  async function downloadGIF() {
    if (!image) return;

    setIsExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const w = width;
      const h = canvasHeight();

      const exportCanvas = document.createElement("canvas");

      exportCanvas.width = w;
      exportCanvas.height = h;

      const ctx = exportCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!ctx) {
        throw new Error("Impossibile inizializzare il canvas.");
      }

      const gif = GIFEncoder();

      const duration = 4000;
      const fps = 12;
      const frames = (duration / 1000) * fps;
      const delay = 1000 / fps;

      for (let i = 0; i < frames; i++) {
        const time = (i / frames) * duration;

        drawFrame(ctx, w, h, time);

        const imageData = ctx.getImageData(0, 0, w, h);

        const palette = quantize(imageData.data, 256, {
          format: "rgba4444",
        });

        const index = applyPalette(
          imageData.data,
          palette,
          "rgba4444"
        );

        gif.writeFrame(index, w, h, {
          palette,
          delay,
        });
      }

      gif.finish();

      const bytes = gif.bytes();

      const blob = new Blob([bytes], {
        type: "image/gif",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `firma-${season}.gif`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      alert(
        "Si è verificato un errore durante la generazione della GIF."
      );
    } finally {
      setIsExporting(false);
    }
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* HEADER */}

        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
            Signature Animator
          </p>

          <h1 className="text-4xl font-bold">
            Dai vita al tuo logo.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Carica un logo PNG, scegli un effetto stagionale e scarica
            la tua firma.
          </p>
        </header>

        {!image ? (

          /* =================================================
             UPLOAD SCREEN
             ================================================= */

          <label
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex min-h-80 cursor-pointer
              flex-col items-center justify-center
              rounded-3xl border-2 border-dashed
              transition
              ${
                isDragging
                  ? "scale-[1.01] border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50"
              }
            `}
          >
            <div
              className={`
                flex h-20 w-20
                items-center justify-center
                rounded-2xl transition
                ${
                  isDragging
                    ? "bg-blue-100"
                    : "bg-slate-100"
                }
              `}
            >
              <span className="text-4xl">
                {isDragging ? "↓" : "🖼️"}
              </span>
            </div>

            <span className="mt-5 text-lg font-semibold">
              {isDragging
                ? "Rilascia qui il logo"
                : "Trascina qui il tuo logo"}
            </span>

            <span className="mt-2 text-sm text-slate-500">
              oppure clicca per selezionarlo
            </span>

            <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              PNG • max 5 MB
            </span>

            <input
              type="file"
              accept="image/png"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        ) : (

          /* =================================================
             EDITOR
             ================================================= */

          <div className="grid gap-8 lg:grid-cols-[360px_1fr]">

            {/* CONTROLLI */}

            <section className="space-y-7 rounded-3xl bg-white p-6 shadow-sm">

              {/* PRESET */}

              <div>
                <h2 className="mb-4 font-semibold">
                  1. Scegli la stagione
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSeason(preset.id)}
                      className={`
                        rounded-2xl border
                        p-4 text-left transition
                        ${
                          season === preset.id
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 hover:border-slate-300"
                        }
                      `}
                    >
                      <div className="text-2xl">
                        {preset.emoji}
                      </div>

                      <div className="mt-2 text-sm font-medium">
                        {preset.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* DIMENSIONE */}

              <div>
                <h2 className="mb-4 font-semibold">
                  2. Dimensione
                </h2>

                <div className="flex gap-2">
                  {Object.entries(sizes).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setWidth(value)}
                      className={`
                        flex-1 rounded-xl
                        border px-3 py-2
                        text-sm transition
                        ${
                          width === value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 hover:bg-slate-50"
                        }
                      `}
                    >
                      {value}px
                    </button>
                  ))}
                </div>
              </div>

              {/* DOWNLOAD */}

              <div className="border-t border-slate-100 pt-6">
                <button
                  onClick={downloadGIF}
                  disabled={isExporting}
                  className="
                    w-full rounded-xl
                    bg-blue-600 px-4 py-3
                    font-semibold text-white
                    transition
                    hover:bg-blue-700
                    disabled:cursor-wait
                    disabled:opacity-50
                  "
                >
                  {isExporting
                    ? "Generazione GIF..."
                    : "Scarica GIF animata"}
                </button>

                <button
                  onClick={downloadPNG}
                  disabled={isExporting}
                  className="
                    mt-3 w-full
                    rounded-xl border
                    border-slate-300
                    px-4 py-3
                    font-semibold
                    transition
                    hover:bg-slate-50
                    disabled:opacity-50
                  "
                >
                  Scarica PNG statico
                </button>

                <label className="mt-5 block cursor-pointer text-center text-sm text-slate-500 underline hover:text-slate-800">
                  Cambia logo

                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </section>

            {/* PREVIEW */}

            <section className="flex min-h-[520px] flex-col rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Anteprima
                </h2>

                <p className="text-sm text-slate-500">
                  {width}px • sfondo trasparente
                </p>
              </div>

              <div
                className="
                  flex flex-1
                  items-center justify-center
                  overflow-hidden
                  rounded-2xl
                "
                style={{
                  backgroundColor: "#ffffff",
                  backgroundImage:
                    "linear-gradient(45deg,#f1f5f9 25%,transparent 25%),linear-gradient(-45deg,#f1f5f9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1f5f9 75%),linear-gradient(-45deg,transparent 75%,#f1f5f9 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition:
                    "0 0,0 10px,10px -10px,-10px 0px",
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="max-h-[400px] max-w-full"
                />
              </div>
            </section>
          </div>
        )}

        {/* PRIVACY */}

        <p className="mt-8 text-center text-xs text-slate-400">
          Il logo viene elaborato direttamente nel browser e non viene
          salvato.
        </p>
      </div>
    </main>
  );
}

/* ============================================================
   PRIMAVERA
   ============================================================ */

function drawSpring(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  const x = w * 0.88;
  const y = h * 0.82;

  const progress = Math.min(1, time / 1200);

  const radius = Math.max(
    4,
    h * 0.065 * progress
  );

  ctx.save();

  ctx.translate(x, y);

  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;

    ctx.fillStyle = "#fffdf4";

    ctx.beginPath();

    ctx.ellipse(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      radius * 0.45,
      radius,
      angle,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.fillStyle = "#f5b82e";

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    radius * 0.5,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}

/* ============================================================
   PASQUA
   ============================================================ */

function drawEaster(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  const angle = Math.sin(time / 320) * 0.12;

  ctx.save();

  ctx.translate(
    w * 0.88,
    h * 0.76
  );

  ctx.rotate(angle);

  ctx.fillStyle = "#f7c948";

  ctx.beginPath();

  ctx.ellipse(
    0,
    0,
    h * 0.055,
    h * 0.075,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.strokeStyle = "#ffffff";

  ctx.lineWidth = Math.max(
    1,
    h * 0.008
  );

  ctx.beginPath();

  ctx.moveTo(
    -h * 0.035,
    0
  );

  ctx.lineTo(
    h * 0.035,
    0
  );

  ctx.stroke();

  ctx.restore();
}

/* ============================================================
   ESTATE
   ============================================================ */

function drawSummer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  /* SOLE */

  const x = w * 0.1;
  const y = h * 0.2;
  const radius = h * 0.045;

  ctx.save();

  ctx.translate(x, y);
  ctx.rotate(time / 3500);

  ctx.strokeStyle = "#f5a623";
  ctx.lineWidth = 2;

  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;

    ctx.beginPath();

    ctx.moveTo(
      Math.cos(angle) * radius * 1.4,
      Math.sin(angle) * radius * 1.4
    );

    ctx.lineTo(
      Math.cos(angle) * radius * 2,
      Math.sin(angle) * radius * 2
    );

    ctx.stroke();
  }

  ctx.fillStyle = "#ffc83d";

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();

  /* PALMA */

  const sway = Math.sin(time / 600) * 0.08;

  ctx.save();

  ctx.translate(
    w * 0.9,
    h * 0.82
  );

  ctx.rotate(sway);

  ctx.strokeStyle = "#9a6735";

  ctx.lineWidth = Math.max(
    2,
    h * 0.018
  );

  ctx.beginPath();

  ctx.moveTo(0, 0);

  ctx.lineTo(
    -h * 0.02,
    -h * 0.17
  );

  ctx.stroke();

  ctx.strokeStyle = "#3e8e5b";

  ctx.lineWidth = Math.max(
    2,
    h * 0.018
  );

  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();

    ctx.moveTo(
      -h * 0.02,
      -h * 0.17
    );

    ctx.lineTo(
      i * h * 0.04,
      -h * (0.2 + Math.abs(i) * 0.01)
    );

    ctx.stroke();
  }

  ctx.restore();
}

/* ============================================================
   AUTUNNO
   ============================================================ */

function drawAutumn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  const colors = [
    "#d97706",
    "#b45309",
    "#dc6b2f",
    "#eab308",
  ];

  for (let i = 0; i < 4; i++) {
    const progress =
      (time / 4500 + i * 0.23) % 1;

    const x =
      w * (0.15 + i * 0.23) +
      Math.sin(progress * Math.PI * 4) * 12;

    const y =
      -10 +
      progress * (h + 20);

    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(
      progress * Math.PI * 3 + i
    );

    ctx.fillStyle = colors[i];

    ctx.beginPath();

    ctx.ellipse(
      0,
      0,
      Math.max(3, h * 0.025),
      Math.max(5, h * 0.045),
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}

/* ============================================================
   HALLOWEEN
   ============================================================ */

function drawHalloween(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  for (let i = 0; i < 3; i++) {
    const progress =
      (time / 3800 + i * 0.32) % 1;

    const x =
      -30 +
      progress * (w + 60);

    const y =
      h * (0.25 + i * 0.22) +
      Math.sin(time / 220 + i) * 8;

    const size = Math.max(
      6,
      h * (0.03 + i * 0.006)
    );

    ctx.save();

    ctx.translate(x, y);

    ctx.fillStyle = "#27272a";

    /* CORPO */

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      size * 0.35,
      0,
      Math.PI * 2
    );

    ctx.fill();

    const wing =
      Math.sin(time / 110) *
      size *
      0.35;

    /* ALA SINISTRA */

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.quadraticCurveTo(
      -size,
      -size - wing,
      -size * 1.4,
      0
    );

    ctx.quadraticCurveTo(
      -size,
      -size * 0.1,
      0,
      size * 0.3
    );

    ctx.fill();

    /* ALA DESTRA */

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.quadraticCurveTo(
      size,
      -size - wing,
      size * 1.4,
      0
    );

    ctx.quadraticCurveTo(
      size,
      -size * 0.1,
      0,
      size * 0.3
    );

    ctx.fill();

    ctx.restore();
  }
}

/* ============================================================
   NATALE
   ============================================================ */

function drawChristmas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  const count = 14;

  for (let i = 0; i < count; i++) {
    const speed =
      4200 +
      (i % 5) * 350;

    const progress =
      ((time + i * 430) % speed) /
      speed;

    const baseX =
      ((i * 73) % 100) /
      100;

    const drift =
      Math.sin(time / 700 + i) * 5;

    const x =
      baseX * w +
      drift;

    const y =
      progress * (h + 12) -
      6;

    const radius =
      1.4 +
      (i % 3) * 0.8;

    ctx.save();

    ctx.globalAlpha =
      0.55 +
      (i % 4) * 0.12;

    ctx.fillStyle = "#ffffff";

    /*
      Piccola ombra per rendere
      la neve visibile anche
      sui loghi molto chiari.
    */
    ctx.shadowColor =
      "rgba(71,85,105,0.65)";

    ctx.shadowBlur = 2;

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}
