import { describe, expect, it } from "vitest";
import { parseReadBeacon, READ_DEPTHS, type ReadDepth } from "../src/core/analytics";
import { CATALOG } from "../src/core/catalog";
import { oncePerDepth, readBeaconBody } from "../src/client/story-beacon";

describe("readBeaconBody", () => {
  it("builds exactly what the Worker's parser accepts, for every exhibit and depth", () => {
    for (const item of CATALOG) {
      for (const depth of READ_DEPTHS) {
        const body: unknown = JSON.parse(readBeaconBody(item.slug, depth));
        expect(parseReadBeacon(body), `${item.slug} ${depth}`).toEqual({
          itemSlug: item.slug,
          depth,
        });
      }
    }
  });

  it("carries the item and the depth and nothing else", () => {
    expect(readBeaconBody("alien-paperclip", "opened")).toBe(
      '{"item":"alien-paperclip","depth":"opened"}',
    );
  });

  it("is turned away by the Worker when the page had no item to name", () => {
    expect(parseReadBeacon(JSON.parse(readBeaconBody("", "opened")))).toBeUndefined();
  });
});

describe("oncePerDepth", () => {
  it("sends each depth at most once, and remembers which went", () => {
    const sent: ReadDepth[] = [];
    const beacon = oncePerDepth((depth) => sent.push(depth));
    expect(beacon.sent("opened")).toBe(false);
    beacon.send("opened");
    beacon.send("opened");
    expect(sent).toEqual(["opened"]);
    expect(beacon.sent("opened")).toBe(true);
    expect(beacon.sent("finished")).toBe(false);
    beacon.send("finished");
    beacon.send("finished");
    beacon.send("opened");
    expect(sent).toEqual(["opened", "finished"]);
  });
});
