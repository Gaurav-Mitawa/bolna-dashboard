declare module '@radix-ui/react-slot' {
  import { ReactNode } from 'react';

  interface SlotProps {
    children: ReactNode;
  }

  export const Slot: React.ForwardRefExoticComponent<
    SlotProps & React.RefAttributes<any>
  >;

  export const Slottable: React.FC<{ children: ReactNode }>;
}
