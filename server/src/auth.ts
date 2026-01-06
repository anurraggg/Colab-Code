import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

passport.serializeUser((user: any, done) => {
    console.log('Serialize User:', user.id);
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    console.log('Deserialize User:', id);
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        console.log('Deserialized User Found:', !!user);
        done(null, user);
    } catch (err) {
        console.error('Deserialize Error:', err);
        done(err, null);
    }
});

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3001/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        console.log('Google Strategy Callback:', profile.id);
        try {
            const email = profile.emails?.[0].value;
            if (!email) return done(new Error("No email found"), undefined);

            const user = await prisma.user.upsert({
                where: { email },
                update: { name: profile.displayName, avatar: profile.photos?.[0].value },
                create: {
                    email,
                    name: profile.displayName || 'User',
                    avatar: profile.photos?.[0].value,
                    provider: 'google',
                    providerId: profile.id
                }
            });
            console.log('User Upserted:', user.id);
            done(null, user);
        } catch (err) {
            console.error('Google Auth Error:', err);
            done(err, undefined);
        }
    }));
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3001/auth/github/callback"
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        console.log('GitHub Strategy Callback:', profile.id);
        try {
            const email = profile.emails?.[0].value || `${profile.username}@github.com`;

            const user = await prisma.user.upsert({
                where: { email },
                update: { name: profile.displayName || profile.username, avatar: profile.photos?.[0].value },
                create: {
                    email,
                    name: profile.displayName || profile.username,
                    avatar: profile.photos?.[0].value,
                    provider: 'github',
                    providerId: profile.id
                }
            });
            console.log('User Upserted:', user.id);
            done(null, user);
        } catch (err) {
            console.error('GitHub Auth Error:', err);
            done(err, undefined);
        }
    }));
}
