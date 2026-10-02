import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function BrandMark({ size = 58 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Rect x="24" y="25" width="76" height="68" rx="12" fill="#F3F7FB" />
      <Path
        d="M45 38v42"
        stroke="#153064"
        strokeWidth="3"
        strokeDasharray="4 5"
        strokeLinecap="round"
      />
      <Path
        d="M57 44h30M57 58h24M57 72h16"
        stroke="#153064"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Circle cx="88" cy="86" r="18" fill="#65D9BD" />
      <Path
        d="m80 86 5 5 11-12"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
