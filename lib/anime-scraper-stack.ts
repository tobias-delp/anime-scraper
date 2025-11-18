import * as cdk from 'aws-cdk-lib';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs';

// TODO: do really change the permission for my lambdas
// TODO: added another todo
// TODO: second todo

export class AnimeScraperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create dynamoDB
    const animeTable = new Table(
      this,
      "AnimeScraperTable",
      {
        partitionKey: { name: "url", type: AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY
      }
    )

    // create scraper lambda
    const scraperLambda = new NodejsFunction(
      this,
      "ScraperLambda",
      {
        entry: 'src/lambdas/scraper-function.ts',
        environment: {
          TABLE_NAME: animeTable.tableName
        },
        timeout: cdk.Duration.seconds(30)
      }
    )
    // grant the lambda read/write permission on the db
    animeTable.grantReadWriteData(scraperLambda)

    // create telegram webhook lambda
    const telegramWebhookLambda = new NodejsFunction(
      this,
      "TelegramWebhookLambda",
      {
        entry: 'src/lambdas/telegramWebhook-function.ts',
        environment: {
          TABLE_NAME: animeTable.tableName
        },
        timeout: cdk.Duration.seconds(30)
      }
    )
    // grant the lambda read/write permission on the db
    animeTable.grantReadWriteData(telegramWebhookLambda)

    // create lambda function url
    const telegramWebhookUrl = telegramWebhookLambda.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE
    })
    // TODO: automatically check if the webhook is already registered, otherwise register it
    // maybe custom cdk construct
    // log url
    new cdk.CfnOutput(
      this,
      'TelegramWebhookUrl',
      { value: telegramWebhookUrl.url }
    )

    // create EvenBridge Rule
    const rule = new Rule(
      this,
      'HourlyScrapeRule',
      {
        schedule: Schedule.rate(cdk.Duration.hours(1))
      }
    )
    rule.addTarget(new LambdaFunction(scraperLambda))
  }
}
