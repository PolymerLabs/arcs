package com.google.arcs;

import com.intellij.lang.Language;

public class ArcsLanguage extends Language {
    public static final ArcsLanguage INSTANCE = new ArcsLanguage();
    private ArcsLanguage() {
        super("Arcs");
    }
}
