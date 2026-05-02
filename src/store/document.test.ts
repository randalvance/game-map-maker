import { beforeEach, describe, expect, it } from "vitest";
import { useDocument } from "./document";
import { createNewProject } from "@/model/project";

const UUIDV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

beforeEach(() => {
  // reset the singleton store between tests
  useDocument.setState({ project: createNewProject(), dirty: false });
});

describe("useDocument.ensureProjectId", () => {
  it("mints a UUIDv4 when none exists", () => {
    expect(useDocument.getState().project.projectId).toBeUndefined();
    const id = useDocument.getState().ensureProjectId();
    expect(id).toMatch(UUIDV4);
    expect(useDocument.getState().project.projectId).toBe(id);
  });

  it("returns the same id on subsequent calls", () => {
    const id1 = useDocument.getState().ensureProjectId();
    const id2 = useDocument.getState().ensureProjectId();
    expect(id1).toBe(id2);
  });

  it("does not mark the document dirty", () => {
    useDocument.setState({ dirty: false });
    useDocument.getState().ensureProjectId();
    expect(useDocument.getState().dirty).toBe(false);
  });

  it("preserves dirty=true if it was already dirty", () => {
    useDocument.setState({ dirty: true });
    useDocument.getState().ensureProjectId();
    expect(useDocument.getState().dirty).toBe(true);
  });
});

describe("replaceProject preserves projectId from input", () => {
  it("loaded project keeps its existing projectId", () => {
    const fresh = createNewProject(2, 2);
    const id = "8e6f9c5a-1b2c-4d5e-9f0a-1b2c3d4e5f60";
    useDocument.getState().replaceProject({ ...fresh, projectId: id });
    expect(useDocument.getState().project.projectId).toBe(id);
    expect(useDocument.getState().dirty).toBe(false);
  });
});
