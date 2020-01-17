package com.google.arcs;

import com.intellij.openapi.fileTypes.*;
import org.jetbrains.annotations.NotNull;

public class ArcsFileTypeFactory extends FileTypeFactory {

  private static final FileNameMatcher EXTENSION_MATCHER = new ExtensionFileNameMatcher("arcs");

  @Override
  public void createFileTypes(@NotNull FileTypeConsumer fileTypeConsumer) {
    fileTypeConsumer.consume(ArcsFileType.INSTANCE, EXTENSION_MATCHER);
  }
}
