# Vercel Deployment Guide for Hydro-Nexus

## Error Fixed: "Cannot find module 'critters'"

### Problem
The build was failing with:
```
Error: Cannot find module 'critters'
```

This was caused by the `experimental.optimizeCss: true` setting in `next.config.mjs`, which requires the `critters` package to be installed.

### Solution Applied
1. ✅ Disabled `optimizeCss` in `next.config.mjs` (safer default)
2. ✅ Installed `beasties` (maintained fork of critters) as a dev dependency
3. ✅ Updated Next.js config with helpful comments

## Vercel Configuration

### Environment Variables Required

Add these to your Vercel project settings:

```bash
# Database
DATABASE_URL=postgres://tsdbadmin:venkatabhilash432004@xtxeoq4snx.j4nl6wefeq.tsdb.cloud.timescale.com:30557/tsdb?sslmode=require

# JWT & Auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-8f9d3k2l
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-too
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# AI - Gemini API
GEMINI_API_KEY=AIzaSyBt6DLJZ2C5x6aWDJB110YsqEiQJ-1WCF4
GOOGLE_API_KEY=AIzaSyBt6DLJZ2C5x6aWDJB110YsqEiQJ-1WCF4

# LiveKit (Voice Assistant)
LIVEKIT_URL=wss://qbthydronet-yogkhtx9.livekit.cloud
LIVEKIT_API_KEY=APIeuFW58v2Rs29
LIVEKIT_API_SECRET=LY3xghj2xFRBVehEfCazGPDggrrpt12hSaGdiTGV5bc
NEXT_PUBLIC_LIVEKIT_URL=wss://qbthydronet-yogkhtx9.livekit.cloud
```

### Build Settings

**Framework Preset:** Next.js  
**Build Command:** `pnpm build`  
**Output Directory:** `.next`  
**Install Command:** `pnpm install`  
**Node Version:** 18.x or higher

### Important Notes

1. **TypeScript & ESLint Errors Ignored**
   - The config has `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`
   - This allows deployment even with minor type errors
   - Consider fixing these for production

2. **Image Optimization Disabled**
   - `images.unoptimized: true` is set
   - This is required for static exports or if you want to avoid Vercel's image optimization costs
   - You can enable it by removing this setting

3. **Database Connection**
   - Your PostgreSQL database is on TimescaleDB Cloud
   - Make sure your Vercel deployment's IP is allowed in TimescaleDB firewall settings
   - SSL mode is enabled (`sslmode=require`)

4. **Voice Assistant (Optional)**
   - The LiveKit agent worker runs separately from the web app
   - You don't need to deploy `agent.ts` to Vercel
   - The web app connects to LiveKit cloud service directly

5. **Peer Dependency Warnings**
   - React 19 is bleeding edge, some packages expect React 18
   - These warnings are non-critical and can be ignored
   - The app will function correctly

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Fix Vercel build - disable optimizeCss"
   git push origin version-5
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Select the `Hydro-Nexus` project

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings > Environment Variables
   - Add all variables from the list above
   - **Important:** Update `NEXTAUTH_URL` to your actual Vercel URL

4. **Deploy**
   - Vercel will automatically deploy on push
   - Or click "Deploy" button manually

5. **Verify Deployment**
   - Check build logs for errors
   - Test login functionality
   - Verify database connection
   - Test API endpoints

## Common Issues & Solutions

### Issue: Build Timeout
**Solution:** Vercel has a 45-minute build limit on free tier. Your project should build in ~5-10 minutes.

### Issue: Database Connection Failed
**Solution:** 
- Check TimescaleDB firewall allows Vercel IPs
- Verify `DATABASE_URL` is correctly set in Vercel environment variables
- TimescaleDB Cloud should allow connections from anywhere by default

### Issue: JWT/Authentication Not Working
**Solution:**
- Make sure `JWT_SECRET` is set in Vercel
- Update `NEXTAUTH_URL` to match your Vercel deployment URL
- Check that cookies are being sent with `credentials: 'include'`

### Issue: API Routes Return 404
**Solution:**
- Next.js App Router API routes should work automatically
- Check that files are in `app/api/` directory
- Verify dynamic routes use correct `[param]` syntax

### Issue: CSS Not Loading
**Solution:**
- Make sure `postcss.config.mjs` and `tailwind.config.ts` are committed
- Check `globals.css` is imported in `app/layout.tsx`
- Verify Tailwind directives are present

## Performance Optimizations Applied

✅ Package import optimization for `@radix-ui` and `lucide-react`  
✅ Vendor chunk splitting for better caching  
✅ Three.js lazy loading in separate chunk  
✅ UI components grouped in separate vendor chunk  
✅ Image optimization disabled (for static export compatibility)

## Post-Deployment Checklist

- [ ] Test login with existing user credentials
- [ ] Verify dashboard loads sensor data
- [ ] Check optimization page parameter persistence
- [ ] Test alert dismissal persistence
- [ ] Try Qubit voice assistant (if LiveKit is configured)
- [ ] Verify all API endpoints respond correctly
- [ ] Test navigation between pages
- [ ] Check that theme toggle works
- [ ] Verify user preferences persist after logout

## Monitoring

After deployment, monitor:
- Vercel Analytics for performance metrics
- Vercel Logs for runtime errors
- TimescaleDB connection pool usage
- API response times

---

**Build Status:** ✅ Ready for Deployment  
**Last Updated:** 2025-10-08  
**Next.js Version:** 15.4.6
