'use client';

import {useRef, useEffect} from 'react';
import {isEqual} from 'lodash';

export function useIsEqualRef<T>(
  value: T,
  initialValue?: T
): React.MutableRefObject<T> {
  const ref = useRef<T>(initialValue || value);

  useEffect(() => {
    if (!isEqual(ref.current, value)) {
      ref.current = value;
    }
  }, [value]);

  return ref;
}
