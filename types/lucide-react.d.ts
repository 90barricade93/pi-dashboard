declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }
  
  export const RefreshCw: FC<IconProps>
  export const AlertCircle: FC<IconProps>
  export const Twitter: FC<IconProps>
  export const Info: FC<IconProps>
  export const CheckIcon: FC<IconProps>
  export const ArrowUp: FC<IconProps>
  export const ArrowDown: FC<IconProps>
  export const ArrowUpRight: FC<IconProps>
  export const ArrowDownRight: FC<IconProps>
  export const TrendingUp: FC<IconProps>
  export const TrendingDown: FC<IconProps>
  export const Minus: FC<IconProps>
  export const ExternalLink: FC<IconProps>
} 