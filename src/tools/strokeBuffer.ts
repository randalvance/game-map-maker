import { indexOf } from "@/model/grid";

export type StrokeCell = { x: number; y: number };

export class StrokeBuffer {
  private readonly seen = new Set<number>();
  private readonly cells: StrokeCell[] = [];

  constructor(private readonly width: number) {}

  add(cell: StrokeCell): boolean {
    const key = indexOf(cell.x, cell.y, this.width);
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.cells.push(cell);
    return true;
  }

  addMany(cells: StrokeCell[]): void {
    for (const cell of cells) this.add(cell);
  }

  entries(): readonly StrokeCell[] {
    return this.cells;
  }

  size(): number {
    return this.cells.length;
  }

  isEmpty(): boolean {
    return this.cells.length === 0;
  }

  clear(): void {
    this.seen.clear();
    this.cells.length = 0;
  }
}
