export type Producer<T> = () => T;

export type Consumer<T> = (input: T) => void;

export type Runnable = () => void;

export type Predicate<T> = (input: T) => boolean;

