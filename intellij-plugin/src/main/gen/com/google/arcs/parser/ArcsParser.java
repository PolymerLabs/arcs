// This is a generated file. Not intended for manual editing.
package com.google.arcs.parser;

import com.intellij.lang.PsiBuilder;
import com.intellij.lang.PsiBuilder.Marker;
import static com.google.arcs.psi.ArcsTypes.*;
import static com.intellij.lang.parser.GeneratedParserUtilBase.*;
import com.intellij.psi.tree.IElementType;
import com.intellij.lang.ASTNode;
import com.intellij.psi.tree.TokenSet;
import com.intellij.lang.PsiParser;
import com.intellij.lang.LightPsiParser;

@SuppressWarnings({"SimplifiableIfStatement", "UnusedAssignment"})
public class ArcsParser implements PsiParser, LightPsiParser {

  public ASTNode parse(IElementType t, PsiBuilder b) {
    parseLight(t, b);
    return b.getTreeBuilt();
  }

  public void parseLight(IElementType t, PsiBuilder b) {
    boolean r;
    b = adapt_builder_(t, b, this, null);
    Marker m = enter_section_(b, 0, _COLLAPSE_, null);
    r = parse_root_(t, b);
    exit_section_(b, 0, m, t, r, true, TRUE_CONDITION);
  }

  protected boolean parse_root_(IElementType t, PsiBuilder b) {
    return parse_root_(t, b, 0);
  }

  static boolean parse_root_(IElementType t, PsiBuilder b, int l) {
    return arcsFile(b, l + 1);
  }

  /* ********************************************************** */
  // item_*
  static boolean arcsFile(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "arcsFile")) return false;
    while (true) {
      int c = current_position_(b);
      if (!item_(b, l + 1)) break;
      if (!empty_element_parsed_guard_(b, "arcsFile", c)) break;
    }
    return true;
  }

  /* ********************************************************** */
  // DESCRIPTION SPACE STRING_LITERAL
  public static boolean description_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "description_decl")) return false;
    if (!nextTokenIs(b, DESCRIPTION)) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, DESCRIPTION, SPACE, STRING_LITERAL);
    exit_section_(b, m, DESCRIPTION_DECL, r);
    return r;
  }

  /* ********************************************************** */
  // NAME|(HANDLE COLON SPACE (TYPE|HANDLE))|(HANDLE COLON SPACE VERB (SPACE (TYPE|HANDLE))?)
  public static boolean handle_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl")) return false;
    if (!nextTokenIs(b, "<handle decl>", HANDLE, NAME)) return false;
    boolean r;
    Marker m = enter_section_(b, l, _NONE_, HANDLE_DECL, "<handle decl>");
    r = consumeToken(b, NAME);
    if (!r) r = handle_decl_1(b, l + 1);
    if (!r) r = handle_decl_2(b, l + 1);
    exit_section_(b, l, m, r, false, null);
    return r;
  }

  // HANDLE COLON SPACE (TYPE|HANDLE)
  private static boolean handle_decl_1(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl_1")) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, HANDLE, COLON, SPACE);
    r = r && handle_decl_1_3(b, l + 1);
    exit_section_(b, m, null, r);
    return r;
  }

  // TYPE|HANDLE
  private static boolean handle_decl_1_3(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl_1_3")) return false;
    boolean r;
    r = consumeToken(b, TYPE);
    if (!r) r = consumeToken(b, HANDLE);
    return r;
  }

  // HANDLE COLON SPACE VERB (SPACE (TYPE|HANDLE))?
  private static boolean handle_decl_2(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl_2")) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, HANDLE, COLON, SPACE, VERB);
    r = r && handle_decl_2_4(b, l + 1);
    exit_section_(b, m, null, r);
    return r;
  }

  // (SPACE (TYPE|HANDLE))?
  private static boolean handle_decl_2_4(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl_2_4")) return false;
    handle_decl_2_4_0(b, l + 1);
    return true;
  }

  // SPACE (TYPE|HANDLE)
  private static boolean handle_decl_2_4_0(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl_2_4_0")) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeToken(b, SPACE);
    r = r && handle_decl_2_4_0_1(b, l + 1);
    exit_section_(b, m, null, r);
    return r;
  }

  // TYPE|HANDLE
  private static boolean handle_decl_2_4_0_1(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "handle_decl_2_4_0_1")) return false;
    boolean r;
    r = consumeToken(b, TYPE);
    if (!r) r = consumeToken(b, HANDLE);
    return r;
  }

  /* ********************************************************** */
  // IMPORT SPACE FILE
  public static boolean import_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "import_decl")) return false;
    if (!nextTokenIs(b, IMPORT)) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, IMPORT, SPACE, FILE);
    exit_section_(b, m, IMPORT_DECL, r);
    return r;
  }

  /* ********************************************************** */
  // import_decl|schema_decl|particle_decl|recipe_decl|store_decl|handle_decl|description_decl|COMMENT|SPACE|CRLF|NEWLINE
  public static boolean item_(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "item_")) return false;
    boolean r;
    Marker m = enter_section_(b, l, _NONE_, ITEM_, "<item>");
    r = import_decl(b, l + 1);
    if (!r) r = schema_decl(b, l + 1);
    if (!r) r = particle_decl(b, l + 1);
    if (!r) r = recipe_decl(b, l + 1);
    if (!r) r = store_decl(b, l + 1);
    if (!r) r = handle_decl(b, l + 1);
    if (!r) r = description_decl(b, l + 1);
    if (!r) r = consumeToken(b, COMMENT);
    if (!r) r = consumeToken(b, SPACE);
    if (!r) r = consumeToken(b, CRLF);
    if (!r) r = consumeToken(b, NEWLINE);
    exit_section_(b, l, m, r, false, null);
    return r;
  }

  /* ********************************************************** */
  // PARTICLE SPACE NAME SPACE IN SPACE FILE
  public static boolean particle_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "particle_decl")) return false;
    if (!nextTokenIs(b, PARTICLE)) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, PARTICLE, SPACE, NAME, SPACE, IN, SPACE, FILE);
    exit_section_(b, m, PARTICLE_DECL, r);
    return r;
  }

  /* ********************************************************** */
  // RECIPE SPACE NAME
  public static boolean recipe_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "recipe_decl")) return false;
    if (!nextTokenIs(b, RECIPE)) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, RECIPE, SPACE, NAME);
    exit_section_(b, m, RECIPE_DECL, r);
    return r;
  }

  /* ********************************************************** */
  // SCHEMA SPACE NAME
  public static boolean schema_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "schema_decl")) return false;
    if (!nextTokenIs(b, SCHEMA)) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, SCHEMA, SPACE, NAME);
    exit_section_(b, m, SCHEMA_DECL, r);
    return r;
  }

  /* ********************************************************** */
  // STORE SPACE NAME SPACE OF SPACE NAME SPACE IN SPACE FILE
  public static boolean store_decl(PsiBuilder b, int l) {
    if (!recursion_guard_(b, l, "store_decl")) return false;
    if (!nextTokenIs(b, STORE)) return false;
    boolean r;
    Marker m = enter_section_(b);
    r = consumeTokens(b, 0, STORE, SPACE, NAME, SPACE, OF, SPACE, NAME, SPACE, IN, SPACE, FILE);
    exit_section_(b, m, STORE_DECL, r);
    return r;
  }

}
