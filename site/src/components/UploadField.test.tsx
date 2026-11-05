import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { UploadField } from "./UploadField";

afterEach(() => vi.unstubAllGlobals());

const PDF = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n";
const mk = (content: string | Uint8Array, name: string) =>
  new File([content as BlobPart], name);
const csvText = "Date,Description,Amount\n2026-01-01,Coffee,-4.50\n2026-01-02,Pay,100.00\n";

function setup(props: Partial<React.ComponentProps<typeof UploadField>> = {}) {
  const onAccepted = vi.fn();
  const onUseAlternative = vi.fn();
  const onPassword = vi.fn();
  render(
    <UploadField
      needed="csv"
      label="Add your bank file"
      onAccepted={onAccepted}
      onUseAlternative={onUseAlternative}
      onPassword={onPassword}
      {...props}
    />,
  );
  const input = screen.getByLabelText("Add your bank file") as HTMLInputElement;
  return { input, onAccepted, onUseAlternative, onPassword };
}

describe("UploadField", () => {
  it("has a real label", () => {
    const { input } = setup();
    expect(input.type).toBe("file");
    expect(document.querySelector("label[for]")).not.toBeNull();
  });

  it("accepts the right kind", async () => {
    const { input, onAccepted } = setup();
    await userEvent.upload(input, mk(csvText, "bank.csv"));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
    expect(onAccepted.mock.calls[0][1].kind).toBe("csv");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("reads an OFX file directly", async () => {
    const { input, onAccepted } = setup();
    await userEvent.upload(input, mk("OFXHEADER:100\n<OFX>\n</OFX>", "a.qfx"));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
  });

  it("explains a PDF where a CSV is needed, with one alternative and a link", async () => {
    const { input, onAccepted, onUseAlternative } = setup();
    await userEvent.upload(input, mk(PDF, "statement.pdf"));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("This is a PDF bank statement.");
    expect(status).toHaveTextContent("A CSV is a simple spreadsheet file from your bank.");
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /download a CSV/ })).toHaveAttribute("href", "#/help/bank-csv");
    await userEvent.click(screen.getByRole("button", { name: "Read my PDF statement instead" }));
    expect(onUseAlternative).toHaveBeenCalledOnce();
    expect(onUseAlternative.mock.calls[0][2]).toBe("read-pdf-statement");
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it("names a renamed file", async () => {
    const { input } = setup();
    await userEvent.upload(input, mk(PDF, "statement.csv"));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("This file is named .csv, but it is really a PDF inside.");
  });

  it("shows the photo message", async () => {
    const { input } = setup({ needed: "pdf" });
    await userEvent.upload(input, mk(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 0xff, 0xd9]), "p.jpg"));
    expect(await screen.findByRole("status")).toHaveTextContent("This is a photo.");
    expect(screen.getByRole("button", { name: "Read the photo" })).toBeInTheDocument();
  });

  it("shows the Word message", async () => {
    const { input } = setup({ needed: "pdf" });
    const zip = new Uint8Array([
      0x50, 0x4b, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ...new TextEncoder().encode("[Content_Types].xml word/document.xml"),
      0x50, 0x4b, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    await userEvent.upload(input, mk(zip, "form.docx"));
    expect(await screen.findByRole("status")).toHaveTextContent("This is a Word document.");
    expect(screen.getByRole("button", { name: "Turn it into a PDF" })).toBeInTheDocument();
  });

  it("handles an empty file with Try again, and clears the message", async () => {
    const { input } = setup();
    await userEvent.upload(input, mk("", "empty.csv"));
    expect(await screen.findByRole("status")).toHaveTextContent("This file is empty.");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeLessThanOrEqual(2);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("handles a damaged file", async () => {
    const { input } = setup({ needed: "pdf" });
    await userEvent.upload(input, mk("%PDF-1.4\n1 0 obj", "a.pdf"));
    expect(await screen.findByRole("status")).toHaveTextContent("looks damaged");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the too big message", async () => {
    const { input } = setup({ maxBytes: 10 });
    await userEvent.upload(input, mk(csvText, "bank.csv"));
    expect(await screen.findByRole("status")).toHaveTextContent("too big");
  });

  it("asks for a password once and never stores it", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const before = JSON.stringify({ ...localStorage });
    const { input, onPassword } = setup({ needed: "pdf" });
    await userEvent.upload(input, mk("%PDF-1.7\n<< /Encrypt 5 0 R >>\n%%EOF", "locked.pdf"));
    expect(await screen.findByRole("status")).toHaveTextContent("locked with a password");
    const box = screen.getByLabelText("Password") as HTMLInputElement;
    expect(box.type).toBe("password");
    await userEvent.type(box, "hunter2");
    await userEvent.click(screen.getByRole("button", { name: "Use password" }));
    expect(onPassword).toHaveBeenCalledOnce();
    expect(onPassword.mock.calls[0][1]).toBe("hunter2");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.stringify({ ...localStorage })).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button").length).toBeLessThanOrEqual(2);
    setItem.mockRestore();
  });

  it("shows a calm message for an unknown type with a link only", async () => {
    const { input } = setup();
    await userEvent.upload(input, mk(new Uint8Array([0, 1, 2, 250, 0, 9]), "mystery.bin"));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("NT can't tell what kind of file this is.");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("uses a given how-to link", async () => {
    const { input } = setup({ howToHref: "#/help/mine" });
    await userEvent.upload(input, mk(PDF, "s.pdf"));
    await screen.findByRole("status");
    expect(screen.getByRole("link")).toHaveAttribute("href", "#/help/mine");
  });
});
