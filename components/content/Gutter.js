import * as React from 'react';
import {theme} from '../../styles';

export function Gutter({children, ...remaining}) {
  return (
    <div {...remaining}>
      <style jsx>{`
        div {
          margin-bottom: ${theme.spacing[2]};
          float: right;
          user-select: none;
          width: 100%;
        }
        @media (min-width: 600px) {
          div {
            padding-left: ${theme.spacing[1]};
            max-width: calc(${theme.column.width} * 3);
          }
        }
      `}</style>
      {children}
    </div>
  );
}

export function WithGutter({children}) {
  return (
    <div>
      <style jsx>{`
        div {
          display: flex;
          align-items: flex-end;
        }
      `}</style>
      {children}
    </div>
  );
}
