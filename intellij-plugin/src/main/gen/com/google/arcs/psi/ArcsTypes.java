// This is a generated file. Not intended for manual editing.
package com.google.arcs.psi;

import com.intellij.psi.tree.IElementType;
import com.intellij.psi.PsiElement;
import com.intellij.lang.ASTNode;
import com.google.arcs.psi.impl.*;

public interface ArcsTypes {

  IElementType DESCRIPTION_DECL = new ArcsElementType("DESCRIPTION_DECL");
  IElementType HANDLE_DECL = new ArcsElementType("HANDLE_DECL");
  IElementType IMPORT_DECL = new ArcsElementType("IMPORT_DECL");
  IElementType ITEM_ = new ArcsElementType("ITEM_");
  IElementType PARTICLE_DECL = new ArcsElementType("PARTICLE_DECL");
  IElementType RECIPE_DECL = new ArcsElementType("RECIPE_DECL");
  IElementType SCHEMA_DECL = new ArcsElementType("SCHEMA_DECL");
  IElementType STORE_DECL = new ArcsElementType("STORE_DECL");

  IElementType COLON = new ArcsTokenType("COLON");
  IElementType COMMENT = new ArcsTokenType("COMMENT");
  IElementType CRLF = new ArcsTokenType("CRLF");
  IElementType DESCRIPTION = new ArcsTokenType("DESCRIPTION");
  IElementType FILE = new ArcsTokenType("FILE");
  IElementType HANDLE = new ArcsTokenType("HANDLE");
  IElementType IMPORT = new ArcsTokenType("IMPORT");
  IElementType IN = new ArcsTokenType("IN");
  IElementType NAME = new ArcsTokenType("NAME");
  IElementType NEWLINE = new ArcsTokenType("NEWLINE");
  IElementType OF = new ArcsTokenType("OF");
  IElementType PARTICLE = new ArcsTokenType("PARTICLE");
  IElementType RECIPE = new ArcsTokenType("RECIPE");
  IElementType SCHEMA = new ArcsTokenType("SCHEMA");
  IElementType SPACE = new ArcsTokenType("SPACE");
  IElementType STORE = new ArcsTokenType("STORE");
  IElementType STRING_LITERAL = new ArcsTokenType("STRING_LITERAL");
  IElementType TYPE = new ArcsTokenType("TYPE");
  IElementType VERB = new ArcsTokenType("VERB");

  class Factory {
    public static PsiElement createElement(ASTNode node) {
      IElementType type = node.getElementType();
      if (type == DESCRIPTION_DECL) {
        return new ArcsDescriptionDeclImpl(node);
      }
      else if (type == HANDLE_DECL) {
        return new ArcsHandleDeclImpl(node);
      }
      else if (type == IMPORT_DECL) {
        return new ArcsImportDeclImpl(node);
      }
      else if (type == ITEM_) {
        return new ArcsItem_Impl(node);
      }
      else if (type == PARTICLE_DECL) {
        return new ArcsParticleDeclImpl(node);
      }
      else if (type == RECIPE_DECL) {
        return new ArcsRecipeDeclImpl(node);
      }
      else if (type == SCHEMA_DECL) {
        return new ArcsSchemaDeclImpl(node);
      }
      else if (type == STORE_DECL) {
        return new ArcsStoreDeclImpl(node);
      }
      throw new AssertionError("Unknown element type: " + type);
    }
  }
}
