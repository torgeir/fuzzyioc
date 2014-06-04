macro (?.) {
  rule infix { $lhs|$rhs } => {
    ($lhs !== null && $lhs !== undefined
     ? $lhs.$rhs
     : undefined)
  }
}

export (?.);
