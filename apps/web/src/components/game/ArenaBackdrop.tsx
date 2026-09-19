import { useId } from 'react'
import '@/styles/arena-backdrop.css'

/** Shared tournament chamber, kept behind the cards and out of the accessibility tree. */
export function ArenaBackdrop() {
  const id = useId()

  return (
    <svg
      className="arena-backdrop"
      viewBox="0 0 1000 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-chamber`} cx="50%" cy="38%" r="75%">
          <stop className="arena-backdrop-color-air" />
          <stop offset="1" className="arena-backdrop-color-night" />
        </radialGradient>
        <linearGradient id={`${id}-terrace`} x2="0" y2="1">
          <stop className="arena-backdrop-color-metal" />
          <stop offset="1" className="arena-backdrop-color-shadow" />
        </linearGradient>
        <linearGradient id={`${id}-deck`} x1="0" y1="0" x2="0" y2="1">
          <stop className="arena-backdrop-color-deck-back" />
          <stop offset="0.62" className="arena-backdrop-color-deck" />
          <stop offset="1" className="arena-backdrop-color-metal" />
        </linearGradient>
        <linearGradient id={`${id}-fascia`} x1="0" y1="0" x2="0" y2="1">
          <stop className="arena-backdrop-color-metal" />
          <stop offset="0.45" className="arena-backdrop-color-shadow" />
          <stop offset="1" className="arena-backdrop-color-night" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0">
          <stop className="arena-backdrop-color-bronze" />
          <stop offset="0.5" className="arena-backdrop-color-light" />
          <stop offset="1" className="arena-backdrop-color-bronze" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop className="arena-backdrop-color-light" stopOpacity="0.18" />
          <stop offset="1" className="arena-backdrop-color-light" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-pool`}>
          <stop className="arena-backdrop-color-blue" stopOpacity="0.22" />
          <stop offset="1" className="arena-backdrop-color-blue" stopOpacity="0" />
        </radialGradient>
        <g id={`${id}-rib`}>
          <path
            d="M126 -20 191 -20 320 216 320 350 291 367 291 226Z"
            className="arena-backdrop-rib"
          />
          <path
            d="M154 -20 181 -20 306 221 306 354 298 359 298 223Z"
            className="arena-backdrop-rib-face"
          />
          <path d="m190 8 121 218v112" className="arena-backdrop-rib-edge" />
          <path
            d="m214 85 83 150v75l-19 12v-82l-79-143Z"
            className="arena-backdrop-light-housing"
          />
          <path d="m213 107 72 131v64" className="arena-backdrop-light-bar" />
          <path d="m214 109 71 129v61" className="arena-backdrop-light-core" />
          <path d="m272 330 55-25v45l-55 27Z" className="arena-backdrop-rib-foot" />
          <path d="m280 346 38-17" className="arena-backdrop-rib-edge" />
        </g>
      </defs>

      <path fill={`url(#${id}-chamber)`} d="M0 0h1000v640H0z" />

      <g className="arena-backdrop-wall">
        <path d="M344 0v242l-65 80M656 0v242l65 80M395 0v214M605 0v214" />
        <path d="M394 138h212M394 147h212M352 83h296" />
        <path d="m409 0 26 179h130L591 0" />
      </g>
      <path
        d="m345 24 67 274h176l67-274-62 19-40 168H447L407 43Z"
        className="arena-backdrop-roof"
      />
      <path d="m405 45 37 171h116l37-171M445 225h110" className="arena-backdrop-roof-edge" />

      <g className="arena-backdrop-stands">
        <path d="M0 185Q500 341 1000 185v43Q500 384 0 228Z" fill={`url(#${id}-terrace)`} />
        <path d="M0 230Q500 387 1000 230v40Q500 427 0 270Z" fill={`url(#${id}-terrace)`} />
        <path d="M0 275Q500 432 1000 275v40Q500 472 0 315Z" fill={`url(#${id}-terrace)`} />
        <path d="M0 320Q500 477 1000 320v38Q500 515 0 358Z" fill={`url(#${id}-terrace)`} />
        <g className="arena-backdrop-terrace-edge">
          <path d="M0 185Q500 341 1000 185M0 230Q500 387 1000 230M0 275Q500 432 1000 275M0 320Q500 477 1000 320" />
        </g>
        <g className="arena-backdrop-seat-lines">
          <path d="M0 201Q500 357 1000 201M0 246Q500 403 1000 246M0 291Q500 448 1000 291M0 336Q500 493 1000 336" />
        </g>
        <g className="arena-backdrop-aisles">
          <path d="m100 216 57 169m66-140 37 163m129-135 11 155m200 0 11-155m129 135 37-163m66 140 57-169" />
        </g>
        <path
          d="M82 211q56 17 114 29m608 0q58-12 114-29M342 312q45 6 84 8m148 0q39-2 84-8"
          className="arena-backdrop-stand-lights"
        />
      </g>

      <use href={`#${id}-rib`} />
      <use href={`#${id}-rib`} transform="translate(1000) scale(-1 1)" />
      <use href={`#${id}-rib`} transform="translate(-213 24) scale(0.9)" opacity="0.68" />
      <use href={`#${id}-rib`} transform="translate(1213 24) scale(-0.9 0.9)" opacity="0.68" />

      <path d="m267 241 35-8 177 297H359ZM698 233l35 8-92 289H521Z" fill={`url(#${id}-beam)`} />
      <path d="M0 425Q500 330 1000 425v215H0Z" className="arena-backdrop-floor" />
      <g className="arena-backdrop-floor-joints">
        <path d="M0 589 389 397M174 640 443 390M1000 589 611 397M826 640 557 390M0 477q500-52 1000 0M0 564q500-37 1000 0" />
      </g>
      <ellipse cx="500" cy="537" rx="447" ry="95" className="arena-backdrop-platform-shadow" />
      <path d="M90 454a410 116 0 0 0 820 0v30a410 116 0 0 1-820 0Z" fill={`url(#${id}-fascia)`} />
      <path d="M99 473a401 110 0 0 0 802 0" className="arena-backdrop-fascia-seam" />
      <path d="M117 494a390 91 0 0 0 766 0" className="arena-backdrop-underlight" />
      <ellipse
        cx="500"
        cy="454"
        rx="410"
        ry="116"
        fill={`url(#${id}-deck)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="4"
      />
      <ellipse cx="500" cy="451" rx="397" ry="108" className="arena-backdrop-deck-bevel" />
      <ellipse cx="500" cy="451" rx="359" ry="94" className="arena-backdrop-field-line" />
      <ellipse cx="500" cy="451" rx="346" ry="88" className="arena-backdrop-field-line-inner" />
      <path d="M500 357v188M144 451h263m186 0h263" className="arena-backdrop-field-line" />
      <ellipse cx="500" cy="451" rx="93" ry="25" className="arena-backdrop-field-line" />
      <ellipse cx="500" cy="451" rx="38" ry="10" className="arena-backdrop-center-mark" />
      <g className="arena-backdrop-field-detail">
        <path d="m249 389 16 5m-56 34 20 2m20 82 16-5m486-117-16 5m56 34-20 2m-20 82-16-5" />
        <path d="M488 349h24m-24 204h24" />
      </g>
      <ellipse cx="335" cy="418" rx="156" ry="47" fill={`url(#${id}-pool)`} />
      <ellipse cx="665" cy="418" rx="156" ry="47" fill={`url(#${id}-pool)`} />
    </svg>
  )
}
