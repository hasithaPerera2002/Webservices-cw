export type ComparisonOperator = "=" | "!=" | "<" | "<=" | ">" | ">=";

export type QueryOperation =
  | { [key in ComparisonOperator]?: [QueryVariable, string | number] }
  | { and?: QueryOperation[] }
  | { or?: QueryOperation[] };

export type QueryVariable = { var: string };
