import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MANUAL_SECTIONS } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
    }
    
    const section = MANUAL_SECTIONS.find(s => s.id === id);
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    
    const filePath = path.join(process.cwd(), section.file);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File not found on disk: ${section.file}` }, { status: 404 });
    }
    
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    return NextResponse.json({
      id: section.id,
      title: section.title,
      content
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
