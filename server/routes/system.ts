import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'path';
import JSZip from 'jszip';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';

export const systemRouter = Router();

// GET /api/system/health
systemRouter.get('/health', (req: Request, res: Response): void => {
  const settings = Database.getSystemSettings();
  const accounts = Database.getGatewayAccounts();

  res.json({
    status: 'HEALTHY',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'CONNECTED',
    maintenanceMode: settings.maintenanceMode,
    configuredGateways: accounts.length,
    phpCpanelPackageReady: true,
  });
});

// GET /api/system/settings
systemRouter.get('/settings', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, settings: Database.getSystemSettings() });
});

// PUT /api/system/settings
systemRouter.put('/settings', requireAuth('super_admin'), (req: AuthenticatedRequest, res: Response): void => {
  const current = Database.getSystemSettings();
  const updated = { ...current, ...req.body };
  Database.saveSystemSettings(updated);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'SYSTEM_SETTINGS_UPDATED',
    entityType: 'SYSTEM',
    details: 'System settings updated',
  });

  res.json({ success: true, settings: updated });
});

// Helper function to recursively add files from a directory to JSZip
function addDirectoryToZip(zip: JSZip, localDir: string, zipPrefix: string) {
  if (!fs.existsSync(localDir)) return;
  const items = fs.readdirSync(localDir);

  for (const item of items) {
    const fullPath = path.join(localDir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subZip = zip.folder(item);
      if (subZip) {
        addDirectoryToZip(subZip, fullPath, path.join(zipPrefix, item));
      }
    } else {
      const content = fs.readFileSync(fullPath);
      zip.file(item, content);
    }
  }
}

// GET /api/system/download-cpanel-bundle
systemRouter.get('/download-cpanel-bundle', async (req: Request, res: Response): Promise<void> => {
  try {
    const phpDir = path.resolve(process.cwd(), 'php-cpanel');
    const zip = new JSZip();

    // 1. Pack public items directly at the root of the ZIP so extracting directly inside public_html puts index.php, install.php, .htaccess, and assets directly where cPanel expects them!
    const publicDir = path.join(phpDir, 'public');
    if (fs.existsSync(publicDir)) {
      addDirectoryToZip(zip, publicDir, '');
    }

    // 2. Pack backend directories: config, cron, database, src
    const backendDirs = ['config', 'cron', 'database', 'src'];
    for (const bDir of backendDirs) {
      const fullBDir = path.join(phpDir, bDir);
      if (fs.existsSync(fullBDir)) {
        const subFolder = zip.folder(bDir);
        if (subFolder) {
          addDirectoryToZip(subFolder, fullBDir, bDir);
        }
      }
    }

    // 3. Add install.sh and README.md if present
    const installSh = path.join(phpDir, 'install.sh');
    if (fs.existsSync(installSh)) {
      zip.file('install.sh', fs.readFileSync(installSh));
    }
    const readme = path.join(phpDir, 'README.md');
    if (fs.existsSync(readme)) {
      zip.file('README.md', fs.readFileSync(readme));
    }

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="eaglepay-cpanel-production-package.zip"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: `Failed to create ZIP package: ${msg}` });
  }
});

// GET /api/system/download-schema-sql
systemRouter.get('/download-schema-sql', (req: Request, res: Response): void => {
  const schemaPath = path.resolve(process.cwd(), 'php-cpanel/database/schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="schema.sql"');
    res.sendFile(schemaPath);
  } else {
    res.status(404).send('schema.sql not found');
  }
});

// GET /api/system/download-installer-sh
systemRouter.get('/download-installer-sh', (req: Request, res: Response): void => {
  const scriptPath = path.resolve(process.cwd(), 'php-cpanel/install.sh');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'text/x-shellscript');
    res.setHeader('Content-Disposition', 'attachment; filename="install.sh"');
    res.sendFile(scriptPath);
  } else {
    res.status(404).send('install.sh not found');
  }
});
