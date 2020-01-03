package com.google.arcs;

import com.google.arcs.psi.ArcsTypes;
import com.intellij.lexer.FlexLexer;
import com.intellij.psi.tree.IElementType;
import com.intellij.psi.TokenType;

%%

%class ArcsLexer
%implements FlexLexer
%unicode
%function advance
%type IElementType
%eof{  return;
%eof}

CRLF=[\R]
SPACE=" "
NEWLINE=[\r\n]
COMMENT=("//")[^\r\n]*
COLON=":"
VERB=("reads"|"writes"|"consumes"|"provides"|"map")
IN="in"
OF="of"
FILE=\'.*\'
STRING_LITERAL=\`.*\`

NAME=[A-Z]+[a-zA-Z0-9]*
HANDLE=[a-z]+[a-zA-Z0-9]*
TYPE=[\[]?[A-Z]+[a-zA-Z0-9]*[\]]?

IMPORT="import"
DESCRIPTION="description"
SCHEMA="schema"
PARTICLE="particle"
RECIPE="recipe"
STORE="store"

%state WAITING_TYPE

%%

{IMPORT} {return ArcsTypes.IMPORT; }
{PARTICLE} {return ArcsTypes.PARTICLE; }
{SCHEMA} { return ArcsTypes.SCHEMA; }
{RECIPE} { return ArcsTypes.RECIPE; }
{STORE} { return ArcsTypes.STORE; }
{DESCRIPTION} { return ArcsTypes.DESCRIPTION; }

{VERB} { return ArcsTypes.VERB; }
{COLON} { yybegin(WAITING_TYPE); return ArcsTypes.COLON; }
<WAITING_TYPE> {
  {TYPE} { return ArcsTypes.TYPE; }
  {HANDLE} { return ArcsTypes.HANDLE; }
}

{NEWLINE} { yybegin(YYINITIAL); return ArcsTypes.NEWLINE; }
{SPACE} { return ArcsTypes.SPACE; }
{CRLF} { return ArcsTypes.CRLF; }
{COMMENT} { return ArcsTypes.COMMENT; }
{IN} { return ArcsTypes.IN; }
{OF} { return ArcsTypes.OF; }
{NAME} { return ArcsTypes.NAME; }
{HANDLE} { return ArcsTypes.HANDLE; }
{TYPE} { return ArcsTypes.TYPE; }
{FILE} { return ArcsTypes.FILE; }
{STRING_LITERAL} { return ArcsTypes.STRING_LITERAL; }

[^] { return TokenType.BAD_CHARACTER; }
