/** Modulo toujours positif (`mod(-1, 4) === 3`), contrairement à l'opérateur `%` */
export const mod = (n, m) => ((n % m) + m) % m;
