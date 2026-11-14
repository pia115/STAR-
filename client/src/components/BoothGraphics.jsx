/**
 * Hand-drawn pink vintage camera graphic traced directly from the user's sketch.
 * The top viewfinder circle ('o') and bottom concentric lens ('O') align on
 * the vertical center axis (x = 82) so they act as the two "O"s in B-OO-T-H.
 */
export function CameraGraphic({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 164 114"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Top-left shutter button */}
        <path
          d="M24 15 C23 8, 25 6, 33 6 C41 6, 44 8, 44 14"
          strokeWidth="3.2"
        />
        <path
          d="M22 14.5 C28 13.5, 38 13.5, 45 14.5"
          strokeWidth="2.2"
          opacity="0.75"
        />

        {/* Outer rounded camera body (double-stroked for authentic hand-sketched feel) */}
        <path
          d="M32 15 C58 13.5, 108 13, 134 15 C146 16, 152 23, 152 36 C153 56, 153 76, 151 94 C150 101, 144 104, 132 104 C98 105.5, 54 105, 24 103.5 C15 103, 12 98, 12 88 C11.5 68, 11.5 46, 13 31 C14 21, 20 15.5, 32 15 Z"
          strokeWidth="3.6"
        />
        <path
          d="M30 16.5 C62 15, 106 14.5, 135 16.5 C145 17.5, 150 24, 150.5 37 C151 57, 151.5 75, 149.5 92.5 C148.5 99.5, 142 102.5, 130 102.8 C96 104, 52 103.5, 25 102 C16.5 101.5, 13.5 96.5, 13.5 87 C13 67, 13 45, 14.5 32 C15.5 22.5, 21 17, 30 16.5 Z"
          strokeWidth="1.8"
          opacity="0.55"
        />

        {/* Horizontal top band — left & right of viewfinder */}
        <path d="M13 40 C30 39.2, 49 38.8, 68 38.8" strokeWidth="3.2" />
        <path d="M98 38 C116 37.8, 134 37, 151 35.8" strokeWidth="3.2" />

        {/* Vertical accent line to the left of viewfinder (from sketch) */}
        <path d="M61 14.5 C61 21, 61.2 27, 61.2 33.5" strokeWidth="3" />

        {/* Viewfinder square housing */}
        <path
          d="M69 15.5 C77 15, 88 15, 96 15.8 C97.5 22, 98 30, 98 38.2 C88 38.8, 78 39, 68.5 38.5 C68.2 31, 68.5 22.5, 69 15.5 Z"
          strokeWidth="3.1"
        />

        {/* First "O" of BOOTH: small circular viewfinder lens */}
        <circle cx="82.5" cy="27" r="6.8" strokeWidth="3.2" />
        <path
          d="M77 24.5 C78.5 21.5, 84.5 20.5, 87.5 23.5"
          strokeWidth="1.8"
          opacity="0.65"
        />

        {/* Second "O" of BOOTH: triple-ring concentric main camera lens */}
        {/* Outer lens ring */}
        <path
          d="M82.5 41.5 C98 41.2, 109.5 53, 109.2 68.5 C109 84, 97.5 96.2, 82 96 C66.5 95.8, 55.2 83.8, 55.5 68 C55.8 52.5, 67 41.8, 82.5 41.5 Z"
          strokeWidth="3.6"
        />
        {/* Middle lens ring */}
        <path
          d="M82.5 49.5 C93.2 49.5, 101.2 57.8, 101 68.5 C100.8 79, 92.5 87.2, 82 87 C71.5 86.8, 63.8 78.5, 64 68 C64.2 57.5, 71.8 49.5, 82.5 49.5 Z"
          strokeWidth="3"
        />
        {/* Inner lens ring */}
        <path
          d="M82.5 54.5 C90.2 54.5, 96 60.5, 95.8 68.2 C95.6 76, 89.8 81.8, 82.2 81.6 C74.5 81.4, 68.8 75.5, 69 68 C69.2 60.5, 74.8 54.5, 82.5 54.5 Z"
          strokeWidth="2.8"
        />
      </g>
    </svg>
  );
}

/**
 * Hand-drawn 5-petal flower graphic traced directly from the user's sketch.
 */
export function SketchFlower({ className = '', style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 210 195"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Top petal */}
        <path d="M95 84 C81 66, 70 42, 73 21 C75 13, 83 11, 90 14 C94 10, 106 9, 115 12 C124 15, 129 27, 127 46 C125 62, 118 76, 112 86" />
        <path d="M84 22 C88 19, 95 21, 98 25" strokeWidth="1.8" opacity="0.8" />
        <path d="M81 36 C85 52, 92 67, 99 80" strokeWidth="1.8" opacity="0.85" />
        <path d="M103 33 C109 46, 111 64, 108 82" strokeWidth="1.8" opacity="0.85" />

        {/* Top-right petal */}
        <path d="M116 83 C127 64, 144 34, 162 21 C169 16, 176 17, 175 24 C180 23, 186 26, 182 33 C187 35, 188 41, 181 46 C171 54, 152 68, 134 86" />
        <path d="M167 34 C157 40, 143 53, 128 70" strokeWidth="1.8" opacity="0.85" />

        {/* Right ruffled petal */}
        <path d="M126 88 C146 73, 169 57, 183 54 C190 53, 192 60, 187 69 C194 74, 196 86, 192 98 C189 106, 182 110, 177 112 C192 115, 203 122, 200 135 C197 151, 181 162, 161 160 C142 158, 126 144, 116 126" />
        <path d="M180 62 C182 69, 181 78, 178 84" strokeWidth="1.8" opacity="0.8" />
        <path d="M178 90 C172 102, 158 109, 142 110" strokeWidth="1.8" opacity="0.85" />
        <path d="M140 120 C156 123, 174 128, 188 134" strokeWidth="1.8" opacity="0.85" />
        <path d="M124 124 C140 140, 162 149, 182 144" strokeWidth="1.8" opacity="0.8" />

        {/* Bottom petal */}
        <path d="M96 122 C86 138, 73 156, 74 173 C75 182, 83 186, 90 185 C96 190, 106 193, 114 191 C123 188, 128 175, 127 158 C126 143, 120 130, 114 120" />
        <path d="M88 142 C82 154, 80 166, 84 176" strokeWidth="1.8" opacity="0.8" />
        <path d="M111 136 C115 151, 116 167, 114 180" strokeWidth="1.8" opacity="0.85" />
        <path d="M98 174 C101 180, 107 182, 112 179" strokeWidth="1.8" opacity="0.8" />

        {/* Left / bottom-left petals */}
        <path d="M84 85 C67 86, 48 92, 31 89 C22 88, 19 95, 23 103 C29 112, 48 117, 74 115" />
        <path d="M40 79 C52 70, 66 64, 79 63" strokeWidth="2.2" />
        <path d="M35 96 C47 102, 62 104, 77 104" strokeWidth="1.8" opacity="0.85" />
        <path d="M82 115 C64 121, 47 130, 43 139 C40 146, 45 153, 52 153 C53 160, 61 164, 72 162" />
        <path d="M52 136 C51 142, 53 148, 57 151" strokeWidth="1.8" opacity="0.8" />

        {/* Center stamen & pistil details */}
        <circle cx="105" cy="98" r="3" />
        <circle cx="113" cy="95" r="2.5" />
        <circle cx="99" cy="105" r="2.5" />
        <circle cx="109" cy="106" r="3" />
        <circle cx="118" cy="103" r="2.2" />
        <path d="M90 100 C95 98, 100 99, 103 102" strokeWidth="2" />
        <path d="M102 90 C104 94, 106 96, 106 100" strokeWidth="2" />
        <path d="M118 90 C123 86, 128 86, 131 90" strokeWidth="2" />
        <path d="M96 113 C101 116, 108 116, 113 112" strokeWidth="2" />
      </g>
    </svg>
  );
}

/**
 * Cute 4-point graphic sparkle star for background decoration.
 */
export function SparkleStar({ className = '', style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 3 C25.8 15.5, 32.5 22.2, 45 24 C32.5 25.8, 25.8 32.5, 24 45 C22.2 32.5, 15.5 25.8, 3 24 C15.5 22.2, 22.2 15.5, 24 3 Z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  );
}
