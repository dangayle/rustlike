# Markdown Parser Demo

This file tests the **CommonMark subset** parser built with `rustlike`.

## Inline Formatting

Here is _italic text_, **bold text**, and **_bold-italic text_** in a paragraph.
You can also use `inline code` and [visit Rust](https://www.rust-lang.org) for more info.

## Code Blocks

```rust
fn main() {
    let x: Result<i32, &str> = Ok(42);
    match x {
        Ok(val) => println!("Got: {}", val),
        Err(e) => println!("Error: {}", e),
    }
}
```

## Blockquotes

> Rust's type system is designed to help you write correct programs.
> The borrow checker ensures memory safety without a garbage collector.

## Lists

### Unordered

- Result for recoverable errors
- Option for nullable values
- Pattern matching for control flow
- Iterators for lazy evaluation

### Ordered

1. Define your types
2. Write pure functions
3. Handle all cases exhaustively
4. Compose with map and andThen

## Thematic Breaks

The section above covers basics.

---

The section below covers advanced topics.

---

## Hard Line Breaks

This line has a hard break\
and continues here.

## Heading Levels

### Level 3

#### Level 4

##### Level 5

###### Level 6
