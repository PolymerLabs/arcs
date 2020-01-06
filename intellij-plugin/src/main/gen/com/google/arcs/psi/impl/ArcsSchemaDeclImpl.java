// This is a generated file. Not intended for manual editing.
package com.google.arcs.psi.impl;

import java.util.List;
import org.jetbrains.annotations.*;
import com.intellij.lang.ASTNode;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiElementVisitor;
import com.intellij.psi.util.PsiTreeUtil;
import static com.google.arcs.psi.ArcsTypes.*;
import com.intellij.extapi.psi.ASTWrapperPsiElement;
import com.google.arcs.psi.*;

public class ArcsSchemaDeclImpl extends ASTWrapperPsiElement implements ArcsSchemaDecl {

  public ArcsSchemaDeclImpl(@NotNull ASTNode node) {
    super(node);
  }

  public void accept(@NotNull ArcsVisitor visitor) {
    visitor.visitSchemaDecl(this);
  }

  public void accept(@NotNull PsiElementVisitor visitor) {
    if (visitor instanceof ArcsVisitor) accept((ArcsVisitor)visitor);
    else super.accept(visitor);
  }

}
