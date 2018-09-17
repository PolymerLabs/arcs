// In-memory version of the BigCollection API; primarily for testing.
export class PouchDbCursor {
  public readonly version: number;
  private readonly pageSize: number;
  private data;

  constructor(version, data, pageSize) {
    this.version = version;
    this.pageSize = pageSize;
    const copy = [...data];
    copy.sort((a, b) => a.index - b.index);
    this.data = copy.map(v => v.value);
  }

  async next() {
    if (this.data.length === 0) {
      return {done: true};
    }
    return {value: this.data.splice(0, this.pageSize), done: false};
  }

  close() {
    this.data = [];
  }
}
