import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Image } from "expo-image";
import CustomImage from "./custom-image.component";

describe("<CustomImage />", () => {
  test("shows the placeholder until the picture has loaded", () => {
    const handleLoadEnd = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomImage source={{ uri: "https://example.com/photo.png" }} onLoadEnd={handleLoadEnd} />
    );

    // The picture and the placeholder over it.
    expect(UNSAFE_getAllByType(Image)).toHaveLength(2);

    const [picture] = UNSAFE_getAllByType(Image);
    fireEvent(picture, "onLoad", { source: {} });
    fireEvent(picture, "onLoadEnd");

    expect(handleLoadEnd).toHaveBeenCalled();
    // Loaded: only the picture is left.
    expect(UNSAFE_getAllByType(Image)).toHaveLength(1);
  });

  test("keeps the fallback in view when the picture fails", () => {
    const handleError = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomImage source={{ uri: "https://example.com/photo.png" }} onError={handleError} />
    );

    const [picture] = UNSAFE_getAllByType(Image);
    fireEvent(picture, "onError", { error: "Network error" });
    expect(handleError).toHaveBeenCalled();

    fireEvent(UNSAFE_getAllByType(Image)[0], "onLoadEnd");
    // The failed picture, with the placeholder and the fallback still over it.
    expect(UNSAFE_getAllByType(Image)).toHaveLength(3);
  });

  test("ignores Android's 'null model' moment, which isn't a failure", () => {
    const handleError = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomImage source={{ uri: "https://example.com/photo.png" }} onError={handleError} />
    );
    fireEvent(UNSAFE_getAllByType(Image)[0], "onError", { error: "Received null model" });
    expect(handleError).not.toHaveBeenCalled();
    expect(UNSAFE_getAllByType(Image)).toHaveLength(2);
  });
});
