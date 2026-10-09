import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { brandMarkPalette } from './palette';

export function BrandLogo({ size = 84 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Rect x="8" y="8" width="112" height="112" rx="30" fill={brandMarkPalette.blue} />
      <SvgText
        x="64"
        y="80"
        fill={brandMarkPalette.white}
        fontFamily="Arial"
        fontSize="43"
        fontWeight="900"
        textAnchor="middle">
        QL
      </SvgText>
    </Svg>
  );
}
